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
        id: iter.id,
        name: iter.name,
        path: iter.path,
        startDate: iter.attributes?.startDate,
        finishDate: iter.attributes?.finishDate,
        state: determineIterationState(iter, now),
        attributes: iter.attributes
    };
}

/**
 * List all iterations in a project
 */
export async function listIterations(args: ListIterationsArgs): Promise<Iteration[]> {
    await ensureOrgConfigured();
    let command = `az boards iteration project list --project "${args.project}"`;
    
    if (args.depth) {
        command += ` --depth ${args.depth}`;
    }
    
    command += ' --output json';
    
    const { stdout } = await execAsync(command);
    const response = JSON.parse(stdout);
    
    // Handle both direct array and object with value property
    const iterations = Array.isArray(response) ? response : (response.value || []);
    
    return iterations
        .map(formatIteration)
        .sort((a: Iteration, b: Iteration) => {
            // Sort by start date, with nulls last
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
}

/**
 * Get the current active iteration
 */
export async function getCurrentIteration(args: GetCurrentIterationArgs): Promise<Iteration | null> {
    await ensureOrgConfigured();
    const iterations = await listIterations({ project: args.project, team: args.team });
    
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
export async function getIterationWorkItems(args: GetIterationWorkItemsArgs): Promise<any[]> {
    await ensureOrgConfigured();
    // Build WIQL query
    const query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] 
                   FROM workitems 
                   WHERE [System.IterationPath] = '${args.project}\\${args.iteration}'
                   ORDER BY [System.WorkItemType], [System.Id]`;
    
    const command = `az boards query --wiql "${query}" --project "${args.project}" --output json`;
    
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
}

/**
 * Move a work item to a different iteration
 */
export async function moveToIteration(args: MoveToIterationArgs): Promise<any> {
    await ensureOrgConfigured();
    // Build the iteration path
    const iterationPath = args.project ? `${args.project}\\${args.iteration}` : args.iteration;
    
    const command = `az boards work-item update --id ${args.id} --iteration-path "${iterationPath}" --output json`;
    
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    
    return {
        id: result.id,
        title: result.fields?.['System.Title'],
        iteration: result.fields?.['System.IterationPath'],
        message: `Moved work item #${args.id} to iteration ${args.iteration}`
    };
}

/**
 * Get detailed information about a specific iteration
 */
export async function getIterationDetails(args: GetIterationDetailsArgs): Promise<any> {
    await ensureOrgConfigured();
    // Get the iteration details
    const command = `az boards iteration project show --project "${args.project}" --name "${args.iteration}" --output json`;
    
    const { stdout } = await execAsync(command);
    const iteration = JSON.parse(stdout);
    
    // Get work items in this iteration
    const workItems = await getIterationWorkItems({
        project: args.project,
        iteration: args.iteration
    });
    
    // Group work items by type
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
        ...formatIteration(iteration),
        workItemCount: workItems.length,
        workItemsByType: itemsByType,
        workItemsByState: itemsByState,
        workItems: workItems
    };
}

/**
 * Get iteration capacity and team members
 */
export async function getIterationCapacity(args: { project: string; iteration: string; team?: string }): Promise<any> {
    await ensureOrgConfigured();
    try {
        const command = `az boards iteration team list --project "${args.project}" ${args.team ? `--team "${args.team}"` : ''} --output json`;
        
        const { stdout } = await execAsync(command);
        const iterations = JSON.parse(stdout);
        
        // Find the specific iteration
        const iteration = iterations.find((i: any) => i.name === args.iteration || i.path.includes(args.iteration));
        
        if (iteration) {
            return {
                iteration: formatIteration(iteration),
                message: 'Iteration found. Note: Capacity details require additional Azure DevOps APIs not available via CLI.'
            };
        }
        
        return {
            message: 'Iteration not found in team iterations'
        };
    } catch (error: any) {
        // Fallback to basic iteration info
        return {
            message: `Unable to get capacity details: ${error.message}. Use Azure DevOps web interface for detailed capacity planning.`
        };
    }
}
