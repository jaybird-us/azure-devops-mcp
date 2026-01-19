import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
import type {
    Iteration,
    ListIterationsArgs,
    GetIterationWorkItemsArgs,
    MoveToIterationArgs,
    GetCurrentIterationArgs,
    GetIterationDetailsArgs
} from '../types/iterations.js';

const execAsync = promisify(exec);

/**
 * Build org flag for Azure CLI commands
 */
async function getOrgFlag(orgOverride?: string): Promise<string> {
    const org = await ensureOrgConfigured(orgOverride);
    return `--organization "${org}"`;
}

/**
 * Determine if an iteration is past, current, or future
 */
function determineIterationState(iter: any, now: Date = new Date()): 'past' | 'current' | 'future' {
    if (!iter.attributes?.startDate) return 'future';

    const start = new Date(iter.attributes.startDate);
    const finish = iter.attributes.finishDate ? new Date(iter.attributes.finishDate) : null;

    if (now < start) return 'future';
    if (finish && now > finish) return 'past';
    return 'current';
}

/**
 * Format raw iteration data from Azure CLI
 */
function formatIteration(iter: any): Iteration {
    const now = new Date();
    return {
        id: iter.id || iter.identifier,
        name: iter.name,
        path: iter.path,
        startDate: iter.attributes?.startDate,
        finishDate: iter.attributes?.finishDate,
        state: determineIterationState(iter, now),
        attributes: iter.attributes
    };
}

/**
 * Flatten hierarchical iteration structure
 */
function flattenIterations(node: any, result: any[] = []): any[] {
    if (!node) return result;

    // Add the current node
    result.push(node);

    // Process children
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
            flattenIterations(child, result);
        });
    } else if (node.hasChildren && !node.children) {
        // Node has children but they weren't fetched (depth limitation)
        // We can't process them without another API call
    }

    return result;
}

/**
 * List all iterations in a project
 */
export async function listIterations(args: ListIterationsArgs & { organization?: string }): Promise<Iteration[]> {
    const orgFlag = await getOrgFlag(args.organization);
    let command = `az boards iteration project list ${orgFlag} --project "${args.project}"`;

    if (args.depth) {
        command += ` --depth ${args.depth}`;
    } else {
        // Default to depth 5 to get a reasonable tree
        command += ` --depth 5`;
    }

    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const response = JSON.parse(stdout);

        // The response is typically a single root node with children
        let iterations: any[] = [];

        if (Array.isArray(response)) {
            // If it's an array, flatten each root node
            response.forEach(root => {
                flattenIterations(root, iterations);
            });
        } else if (response && typeof response === 'object') {
            // Single root node with hierarchical structure
            if (response.children) {
                // Just get the children, skip the root project node
                response.children.forEach((child: any) => {
                    flattenIterations(child, iterations);
                });
            } else if (response.value && Array.isArray(response.value)) {
                // Alternative structure with value array
                response.value.forEach((iter: any) => {
                    flattenIterations(iter, iterations);
                });
            } else {
                // Single node without children
                iterations = [response];
            }
        }

        // Filter out the root project node if it exists (it has the same name as project)
        iterations = iterations.filter(iter =>
            iter.path && !iter.path.endsWith(`\\${args.project}\\Iteration`) && iter.path !== `\\${args.project}\\Iteration`
        );

        return iterations
            .map(formatIteration)
            .sort((a: Iteration, b: Iteration) => {
                // Sort by start date, with nulls last
                if (!a.startDate) return 1;
                if (!b.startDate) return -1;
                return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            });
    } catch (error: any) {
        console.error('Error listing iterations:', error.message);
        // Return empty array if no iterations exist
        return [];
    }
}

/**
 * Get the current active iteration
 */
export async function getCurrentIteration(args: GetCurrentIterationArgs & { organization?: string }): Promise<Iteration | null> {
    const iterations = await listIterations({ project: args.project, team: args.team, organization: args.organization });

    // Find current iteration
    const current = iterations.find(i => i.state === 'current');

    // If no current iteration, find the closest future one
    if (!current) {
        const future = iterations.filter(i => i.state === 'future');
        if (future.length > 0) {
            return future[0]; // Already sorted by date
        }
    }

    return current || null;
}

/**
 * Get all work items in a specific iteration
 */
export async function getIterationWorkItems(args: GetIterationWorkItemsArgs & { organization?: string }): Promise<any[]> {
    const orgFlag = await getOrgFlag(args.organization);

    // Handle different iteration path formats
    let iterationPath: string;

    if (args.iteration.includes('\\')) {
        // Full path provided - remove \Iteration\ if present
        iterationPath = args.iteration.replace('\\Iteration\\', '\\');
    } else if (args.iteration.toLowerCase() === 'root' || args.iteration === args.project) {
        // Root iteration
        iterationPath = args.project;
    } else {
        // Need to find the actual iteration path
        // Get the iterations list to find the correct path
        try {
            const iterations = await listIterations({ project: args.project, organization: args.organization });
            const matchingIteration = iterations.find(iter =>
                iter.name === args.iteration ||
                iter.path?.endsWith(`\\${args.iteration}`) ||
                iter.path?.includes(`\\${args.iteration}\\`)
            );

            if (matchingIteration && matchingIteration.path) {
                // Remove \Iteration\ from path as work items don't use it
                iterationPath = matchingIteration.path.replace('\\Iteration\\', '\\');
            } else {
                // Fallback - try direct path construction
                // Check if it looks like a nested path
                if (args.iteration.includes('\\')) {
                    iterationPath = `${args.project}\\${args.iteration}`;
                } else {
                    // Try multiple common patterns
                    // Could be Phase 1\\Subitem or direct child
                    iterationPath = `${args.project}\\${args.iteration}`;
                }
            }
        } catch (err) {
            // If listing fails, fallback to direct construction
            iterationPath = `${args.project}\\${args.iteration}`;
        }
    }

    // Build WIQL query
    const query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo]
                   FROM workitems
                   WHERE [System.IterationPath] = '${iterationPath}' OR [System.IterationPath] UNDER '${iterationPath}'
                   ORDER BY [System.WorkItemType], [System.Id]`;

    const command = `az boards query ${orgFlag} --wiql "${query}" --project "${args.project}" --output json`;

    try {
        const { stdout } = await execAsync(command);
        const items = JSON.parse(stdout);

        // Format the results
        if (Array.isArray(items)) {
            return items.map((item) => ({
                id: item.id,
                type: item.fields?.['System.WorkItemType'],
                title: item.fields?.['System.Title'],
                state: item.fields?.['System.State'],
                assignedTo: item.fields?.['System.AssignedTo']?.displayName,
                iteration: item.fields?.['System.IterationPath']
            }));
        }

        return [];
    } catch (error: any) {
        console.error('Error getting iteration work items:', error.message);
        return [];
    }
}

/**
 * Move a work item to a different iteration
 */
export async function moveToIteration(args: MoveToIterationArgs & { organization?: string }): Promise<any> {
    const orgFlag = await getOrgFlag(args.organization);

    // Build the iteration path
    let iterationPath: string;

    if (args.iteration.toLowerCase() === 'root' || args.iteration === args.project) {
        // Moving to root iteration - just use project name
        iterationPath = args.project || '';
    } else if (args.iteration.includes('\\')) {
        // Full path provided
        iterationPath = args.iteration;
    } else {
        // Build path - check if project is provided
        if (args.project) {
            iterationPath = `${args.project}\\${args.iteration}`;
        } else {
            // Try with just the iteration name
            iterationPath = args.iteration;
        }
    }

    // Use --iteration-path instead of --iteration
    const command = `az boards work-item update ${orgFlag} --id ${args.id} --iteration-path "${iterationPath}" --output json`;

    try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);

        return {
            id: result.id,
            title: result.fields?.['System.Title'],
            iteration: result.fields?.['System.IterationPath'],
            message: `Moved work item #${args.id} to iteration ${args.iteration}`
        };
    } catch (error: any) {
        // Fallback to using --iteration if --iteration-path doesn't work
        try {
            const fallbackCommand = `az boards work-item update ${orgFlag} --id ${args.id} --iteration "${iterationPath}" --output json`;
            const { stdout } = await execAsync(fallbackCommand);
            const result = JSON.parse(stdout);

            return {
                id: result.id,
                title: result.fields?.['System.Title'],
                iteration: result.fields?.['System.IterationPath'],
                message: `Moved work item #${args.id} to iteration ${args.iteration}`
            };
        } catch (fallbackError: any) {
            throw new Error(`Failed to move work item: ${error.message}`);
        }
    }
}

/**
 * Get detailed information about a specific iteration
 */
export async function getIterationDetails(args: GetIterationDetailsArgs & { organization?: string }): Promise<any> {
    try {
        // Get all iterations for the project
        const iterations = await listIterations({ project: args.project, depth: 5, organization: args.organization });

        // Find the specific iteration by name or path
        const iteration = iterations.find((iter: Iteration) =>
            iter.name === args.iteration ||
            iter.path?.includes(`\\${args.iteration}`) ||
            iter.path?.endsWith(args.iteration)
        );

        if (!iteration) {
            // Try to get work items anyway in case the iteration exists but wasn't in the list
            const workItems = await getIterationWorkItems({
                project: args.project,
                iteration: args.iteration,
                organization: args.organization
            });

            if (workItems.length > 0) {
                // Iteration exists but wasn't in list, create a basic structure
                const itemsByType: Record<string, any[]> = {};
                const itemsByState: Record<string, any[]> = {};

                workItems.forEach(item => {
                    // Group by type
                    if (!itemsByType[item.type]) {
                        itemsByType[item.type] = [];
                    }
                    itemsByType[item.type].push(item);

                    // Group by state
                    if (!itemsByState[item.state]) {
                        itemsByState[item.state] = [];
                    }
                    itemsByState[item.state].push(item);
                });

                return {
                    name: args.iteration,
                    path: `${args.project}\\${args.iteration}`,
                    workItemCount: workItems.length,
                    workItemsByType: itemsByType,
                    workItemsByState: itemsByState,
                    workItems: workItems
                };
            }

            return {
                error: `Iteration '${args.iteration}' not found in project '${args.project}'`
            };
        }

        // Get work items in this iteration
        const workItems = await getIterationWorkItems({
            project: args.project,
            iteration: args.iteration,
            organization: args.organization
        });

        // Group work items by type and state
        const itemsByType: Record<string, any[]> = {};
        const itemsByState: Record<string, any[]> = {};

        workItems.forEach(item => {
            // Group by type
            if (!itemsByType[item.type]) {
                itemsByType[item.type] = [];
            }
            itemsByType[item.type].push(item);

            // Group by state
            if (!itemsByState[item.state]) {
                itemsByState[item.state] = [];
            }
            itemsByState[item.state].push(item);
        });

        return {
            ...iteration,
            workItemCount: workItems.length,
            workItemsByType: itemsByType,
            workItemsByState: itemsByState,
            workItems: workItems
        };
    } catch (error: any) {
        return {
            error: `Failed to get iteration details: ${error.message}`
        };
    }
}
