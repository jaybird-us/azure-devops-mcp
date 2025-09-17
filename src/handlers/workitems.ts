import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { buildQuery } from '../helpers/queryBuilder.js';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
import { fieldResolver } from '../helpers/fieldResolver.js';
import { HandlerResult } from '../types.js';

const execAsync = promisify(exec);

/**
 * Helper to resolve @Me to current user's email
 * Azure CLI doesn't support @Me token, so we need to resolve it
 */
async function resolveAssignedTo(value: string): Promise<string> {
    if (value === '@Me') {
        try {
            // Get current user's email from Azure CLI
            const { stdout } = await execAsync('az account show --output json');
            const account = JSON.parse(stdout);
            const email = account.user?.name || account.user?.email;
            if (email) {
                return email;
            }
        } catch {
            // If we can't get email, return empty (unassigned)
            console.warn('Could not resolve @Me to email. Work item will be unassigned.');
            return '';
        }
    }
    return value;
}

export async function handleQueryWorkItems(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured();
    const query = buildQuery(args.query);
    let command = `az boards query --wiql "${query}"`;
    if (args.project) command += ` --project "${args.project}"`;
    command += ' --output json';

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);

    // Format the results nicely
    const formatted = Array.isArray(result) ? result.map((item: any) => ({
        id: item.id,
        type: item.fields?.['System.WorkItemType'],
        title: item.fields?.['System.Title'],
        state: item.fields?.['System.State'],
        assignedTo: item.fields?.['System.AssignedTo']?.displayName,
    })) : result;

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
        }],
    };
}

export async function handleGetWorkItem(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured();
    // FIXED: Removed --open false flag that was causing CLI issues
    let command = `az boards work-item show --id ${args.id}`;
    if (args.fields) {
        command += ` --fields "${args.fields}"`;
    }
    command += ' --output json';

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);

    // Extract key fields for readability
    const formatted = {
        id: result.id,
        type: result.fields?.['System.WorkItemType'],
        title: result.fields?.['System.Title'],
        state: result.fields?.['System.State'],
        assignedTo: result.fields?.['System.AssignedTo']?.displayName,
        createdBy: result.fields?.['System.CreatedBy']?.displayName,
        description: result.fields?.['System.Description'],
        tags: result.fields?.['System.Tags'],
        url: result.url,
    };

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
        }],
    };
}

export async function handleCreateWorkItem(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured();
    let command = `az boards work-item create --type "${args.type}" --title "${args.title}"`;

    // FIXED: Check for default project if not specified
    if (!args.project) {
        try {
            const { stdout: configOut } = await execAsync('az devops configure --list --output json');
            const config = JSON.parse(configOut);
            if (config.defaults?.project) {
                command += ` --project "${config.defaults.project}"`;
            }
        } catch {
            // If we can't get default, continue without it
        }
    } else {
        command += ` --project "${args.project}"`;
    }

    if (args.description) {
        const desc = args.description.replace(/"/g, '\\"');
        command += ` --description "${desc}"`;
    }
    if (args.assigned_to) {
        // Resolve @Me to actual email
        const assignedTo = await resolveAssignedTo(args.assigned_to);
        if (assignedTo) {
            command += ` --assigned-to "${assignedTo}"`;
        }
    }
    if (args.tags) {
        command += ` --fields "System.Tags=${args.tags}"`;
    }
    command += ' --output json';

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);

    const formatted = {
        id: result.id,
        type: result.fields?.['System.WorkItemType'],
        title: result.fields?.['System.Title'],
        state: result.fields?.['System.State'],
        url: result.url,
        message: `Created ${args.type} #${result.id}: ${args.title}`,
    };

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
        }],
    };
}

export async function handleUpdateWorkItem(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured();
    let command = `az boards work-item update --id ${args.id}`;

    if (args.title) command += ` --title "${args.title}"`;
    if (args.state) command += ` --state "${args.state}"`;
    if (args.assigned_to) {
        // Resolve @Me to actual email
        const assignedTo = await resolveAssignedTo(args.assigned_to);
        if (assignedTo) {
            command += ` --assigned-to "${assignedTo}"`;
        }
    }
    if (args.description) {
        const desc = args.description.replace(/"/g, '\\"');
        command += ` --description "${desc}"`;
    }
    command += ' --output json';

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);

    // Add comment if provided
    if (args.comment) {
        const commentCommand = `az boards work-item update --id ${args.id} --discussion "${args.comment.replace(/"/g, '\\"')}" --output json`;
        await execAsync(commentCommand);
    }

    const formatted = {
        id: result.id,
        title: result.fields?.['System.Title'],
        state: result.fields?.['System.State'],
        assignedTo: result.fields?.['System.AssignedTo']?.displayName,
        message: `Updated work item #${args.id}`,
    };

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
        }],
    };
}

export async function handleAddComment(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured();
    const command = `az boards work-item update --id ${args.id} --discussion "${args.comment.replace(/"/g, '\\"')}" --output json`;

    await execAsync(command);

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                message: `Added comment to work item #${args.id}`,
            }, null, 2),
        }],
    };
}

export async function handleListMyWork(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured();
    
    // Base query for active items
    let query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
              FROM workitems 
              WHERE [System.AssignedTo] = @Me 
              AND [System.State] <> 'Closed' 
              AND [System.State] <> 'Removed'`;

    // Handle recently completed items with field resolution
    if (args.include_recently_completed) {
        try {
            // Use field resolver to get the correct ClosedDate field
            const closedDateField = await fieldResolver.resolve('ClosedDate');
            
            // Check if the field exists
            const fieldExists = await fieldResolver.fieldExists(closedDateField);
            
            if (fieldExists) {
                query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
                    FROM workitems 
                    WHERE [System.AssignedTo] = @Me 
                    AND ([System.State] <> 'Closed' 
                         OR [${closedDateField}] >= @Today - 7)`;
            } else {
                // Fallback: just get all assigned items including closed ones
                console.warn('ClosedDate field not found. Including all closed items assigned to you.');
                query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
                    FROM workitems 
                    WHERE [System.AssignedTo] = @Me`;
            }
        } catch (error) {
            // If field resolution fails, fall back to default behavior
            console.warn('Field resolution failed. Using fallback query.');
            query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
                FROM workitems 
                WHERE [System.AssignedTo] = @Me`;
        }
    }

    try {
        const command = `az boards query --wiql "${query}" --output json`;
        const { stdout } = await execAsync(command);
        const items = JSON.parse(stdout);

        // Group by state
        const grouped: Record<string, any[]> = {};
        items.forEach((item: any) => {
            const state = item.fields?.['System.State'] || 'Unknown';
            if (!grouped[state]) grouped[state] = [];
            grouped[state].push({
                id: item.id,
                type: item.fields?.['System.WorkItemType'],
                title: item.fields?.['System.Title'],
            });
        });

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(grouped, null, 2),
            }],
        };
    } catch (error: any) {
        // If the query fails, try a simpler query without the ClosedDate field
        if (args.include_recently_completed && error.message.includes('field')) {
            // Retry without the ClosedDate filter
            const fallbackQuery = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
                FROM workitems 
                WHERE [System.AssignedTo] = @Me`;
            
            try {
                const command = `az boards query --wiql "${fallbackQuery}" --output json`;
                const { stdout } = await execAsync(command);
                const items = JSON.parse(stdout);

                // Group by state
                const grouped: Record<string, any[]> = {};
                items.forEach((item: any) => {
                    const state = item.fields?.['System.State'] || 'Unknown';
                    if (!grouped[state]) grouped[state] = [];
                    grouped[state].push({
                        id: item.id,
                        type: item.fields?.['System.WorkItemType'],
                        title: item.fields?.['System.Title'],
                    });
                });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            ...grouped,
                            _note: 'ClosedDate field not available in this process template. Showing all assigned items.'
                        }, null, 2),
                    }],
                };
            } catch (fallbackError: any) {
                throw fallbackError;
            }
        }
        
        // Re-throw original error if not field-related
        throw error;
    }
}