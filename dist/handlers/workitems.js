import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { buildQuery } from '../helpers/queryBuilder.js';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
const execAsync = promisify(exec);
export async function handleQueryWorkItems(args) {
    await ensureOrgConfigured();
    const query = buildQuery(args.query);
    let command = `az boards query --wiql "${query}"`;
    if (args.project)
        command += ` --project "${args.project}"`;
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    const formatted = Array.isArray(result) ? result.map((item) => ({
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
export async function handleGetWorkItem(args) {
    await ensureOrgConfigured();
    let command = `az boards work-item show --id ${args.id}`;
    if (args.fields) {
        command += ` --fields "${args.fields}"`;
    }
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
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
export async function handleCreateWorkItem(args) {
    await ensureOrgConfigured();
    let command = `az boards work-item create --type "${args.type}" --title "${args.title}"`;
    if (!args.project) {
        try {
            const { stdout: configOut } = await execAsync('az devops configure --list --output json');
            const config = JSON.parse(configOut);
            if (config.defaults?.project) {
                command += ` --project "${config.defaults.project}"`;
            }
        }
        catch {
        }
    }
    else {
        command += ` --project "${args.project}"`;
    }
    if (args.description) {
        const desc = args.description.replace(/"/g, '\\"');
        command += ` --description "${desc}"`;
    }
    if (args.assigned_to) {
        command += ` --assigned-to "${args.assigned_to}"`;
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
export async function handleUpdateWorkItem(args) {
    await ensureOrgConfigured();
    let command = `az boards work-item update --id ${args.id}`;
    if (args.title)
        command += ` --title "${args.title}"`;
    if (args.state)
        command += ` --state "${args.state}"`;
    if (args.assigned_to)
        command += ` --assigned-to "${args.assigned_to}"`;
    if (args.description) {
        const desc = args.description.replace(/"/g, '\\"');
        command += ` --description "${desc}"`;
    }
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
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
export async function handleAddComment(args) {
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
export async function handleListMyWork(args) {
    await ensureOrgConfigured();
    let query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
              FROM workitems 
              WHERE [System.AssignedTo] = @Me 
              AND [System.State] <> 'Closed' 
              AND [System.State] <> 'Removed'`;
    if (args.include_recently_completed) {
        query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
            FROM workitems 
            WHERE [System.AssignedTo] = @Me 
            AND ([System.State] <> 'Closed' 
                 OR [System.ClosedDate] >= @Today - 7)`;
    }
    const command = `az boards query --wiql "${query}" --output json`;
    const { stdout } = await execAsync(command);
    const items = JSON.parse(stdout);
    const grouped = {};
    items.forEach((item) => {
        const state = item.fields?.['System.State'] || 'Unknown';
        if (!grouped[state])
            grouped[state] = [];
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
}
