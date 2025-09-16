"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const server = new index_js_1.Server({
    name: 'azure-workitems-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Define work item focused tools
server.setRequestHandler('tools/list', async () => ({
    tools: [
        {
            name: 'query_work_items',
            description: 'Query work items using WIQL or predefined queries',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'WIQL query, or shortcuts: "my-items", "my-bugs", "my-tasks", "recent"'
                    },
                    project: { type: 'string', description: 'Project name (optional)' },
                },
                required: ['query'],
            },
        },
        {
            name: 'get_work_item',
            description: 'Get detailed information about a specific work item',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'number', description: 'Work item ID' },
                    fields: {
                        type: 'string',
                        description: 'Comma-separated field names to include (optional)'
                    },
                },
                required: ['id'],
            },
        },
        {
            name: 'create_work_item',
            description: 'Create a new work item',
            inputSchema: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['Task', 'Bug', 'User Story', 'Feature', 'Epic', 'Issue'],
                        description: 'Work item type'
                    },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    assigned_to: { type: 'string', description: 'Email or @Me (optional)' },
                    priority: {
                        type: 'number',
                        enum: [1, 2, 3, 4],
                        description: 'Priority (1=highest, 4=lowest)'
                    },
                    tags: { type: 'string', description: 'Semicolon-separated tags (optional)' },
                    project: { type: 'string', description: 'Project name (optional)' },
                },
                required: ['type', 'title'],
            },
        },
        {
            name: 'update_work_item',
            description: 'Update an existing work item',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    title: { type: 'string', description: 'New title (optional)' },
                    state: {
                        type: 'string',
                        enum: ['New', 'Active', 'Resolved', 'Closed', 'Removed'],
                        description: 'Work item state (optional)'
                    },
                    assigned_to: { type: 'string', description: 'Email or @Me (optional)' },
                    priority: { type: 'number', enum: [1, 2, 3, 4] },
                    description: { type: 'string' },
                    comment: { type: 'string', description: 'Add a comment (optional)' },
                },
                required: ['id'],
            },
        },
        {
            name: 'add_comment',
            description: 'Add a comment to a work item',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'number', description: 'Work item ID' },
                    comment: { type: 'string', description: 'Comment text' },
                },
                required: ['id', 'comment'],
            },
        },
        {
            name: 'list_my_work',
            description: 'List work items assigned to me, organized by state',
            inputSchema: {
                type: 'object',
                properties: {
                    include_recently_completed: {
                        type: 'boolean',
                        description: 'Include items completed in last 7 days (default: false)'
                    },
                },
            },
        },
    ],
}));
// Helper function to build WIQL queries
function buildQuery(queryType) {
    const queries = {
        'my-items': `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] 
                 FROM workitems 
                 WHERE [System.AssignedTo] = @Me 
                 AND [System.State] <> 'Closed' 
                 AND [System.State] <> 'Removed'
                 ORDER BY [System.Priority], [System.CreatedDate] DESC`,
        'my-bugs': `SELECT [System.Id], [System.Title], [System.State], [System.Priority] 
                FROM workitems 
                WHERE [System.AssignedTo] = @Me 
                AND [System.WorkItemType] = 'Bug' 
                AND [System.State] <> 'Closed'`,
        'my-tasks': `SELECT [System.Id], [System.Title], [System.State], [System.Priority] 
                 FROM workitems 
                 WHERE [System.AssignedTo] = @Me 
                 AND [System.WorkItemType] = 'Task' 
                 AND [System.State] <> 'Closed'`,
        'recent': `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
               FROM workitems 
               WHERE [System.ChangedDate] >= @Today - 7 
               ORDER BY [System.ChangedDate] DESC`,
    };
    return queries[queryType] || queryType;
}
// Implement tool handlers
server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let command;
        let result;
        switch (name) {
            case 'query_work_items': {
                const query = buildQuery(args.query);
                command = `az boards query --wiql "${query}"`;
                if (args.project)
                    command += ` --project "${args.project}"`;
                command += ' --output json';
                const { stdout } = await execAsync(command);
                result = JSON.parse(stdout);
                // Format the results nicely
                if (Array.isArray(result)) {
                    const formatted = result.map((item) => ({
                        id: item.id,
                        type: item.fields?.['System.WorkItemType'],
                        title: item.fields?.['System.Title'],
                        state: item.fields?.['System.State'],
                        assignedTo: item.fields?.['System.AssignedTo']?.displayName,
                        priority: item.fields?.['System.Priority'],
                    }));
                    result = formatted;
                }
                break;
            }
            case 'get_work_item': {
                command = `az boards work-item show --id ${args.id} --open false`;
                if (args.fields) {
                    command += ` --fields "${args.fields}"`;
                }
                command += ' --output json';
                const { stdout } = await execAsync(command);
                result = JSON.parse(stdout);
                // Extract key fields for readability
                result = {
                    id: result.id,
                    type: result.fields?.['System.WorkItemType'],
                    title: result.fields?.['System.Title'],
                    state: result.fields?.['System.State'],
                    assignedTo: result.fields?.['System.AssignedTo']?.displayName,
                    createdBy: result.fields?.['System.CreatedBy']?.displayName,
                    priority: result.fields?.['System.Priority'],
                    description: result.fields?.['System.Description'],
                    tags: result.fields?.['System.Tags'],
                    url: result.url,
                };
                break;
            }
            case 'create_work_item': {
                command = `az boards work-item create --type "${args.type}" --title "${args.title}"`;
                if (args.description) {
                    // Escape quotes in description
                    const desc = args.description.replace(/"/g, '\\"');
                    command += ` --description "${desc}"`;
                }
                if (args.assigned_to) {
                    command += ` --assigned-to "${args.assigned_to}"`;
                }
                if (args.priority) {
                    command += ` --priority ${args.priority}`;
                }
                if (args.tags) {
                    command += ` --fields "System.Tags=${args.tags}"`;
                }
                if (args.project) {
                    command += ` --project "${args.project}"`;
                }
                command += ' --output json';
                const { stdout } = await execAsync(command);
                result = JSON.parse(stdout);
                result = {
                    id: result.id,
                    type: result.fields?.['System.WorkItemType'],
                    title: result.fields?.['System.Title'],
                    state: result.fields?.['System.State'],
                    url: result.url,
                    message: `Created ${args.type} #${result.id}: ${args.title}`,
                };
                break;
            }
            case 'update_work_item': {
                command = `az boards work-item update --id ${args.id}`;
                if (args.title)
                    command += ` --title "${args.title}"`;
                if (args.state)
                    command += ` --state "${args.state}"`;
                if (args.assigned_to)
                    command += ` --assigned-to "${args.assigned_to}"`;
                if (args.priority)
                    command += ` --priority ${args.priority}`;
                if (args.description) {
                    const desc = args.description.replace(/"/g, '\\"');
                    command += ` --description "${desc}"`;
                }
                command += ' --output json';
                const { stdout } = await execAsync(command);
                result = JSON.parse(stdout);
                // Add comment if provided
                if (args.comment) {
                    const commentCommand = `az boards work-item update --id ${args.id} --discussion "${args.comment.replace(/"/g, '\\"')}" --output json`;
                    await execAsync(commentCommand);
                }
                result = {
                    id: result.id,
                    title: result.fields?.['System.Title'],
                    state: result.fields?.['System.State'],
                    assignedTo: result.fields?.['System.AssignedTo']?.displayName,
                    message: `Updated work item #${args.id}`,
                };
                break;
            }
            case 'add_comment': {
                command = `az boards work-item update --id ${args.id} --discussion "${args.comment.replace(/"/g, '\\"')}" --output json`;
                const { stdout } = await execAsync(command);
                result = {
                    message: `Added comment to work item #${args.id}`,
                };
                break;
            }
            case 'list_my_work': {
                // Get active items
                let query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.Priority] 
                    FROM workitems 
                    WHERE [System.AssignedTo] = @Me 
                    AND [System.State] <> 'Closed' 
                    AND [System.State] <> 'Removed'`;
                if (args.include_recently_completed) {
                    query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.Priority] 
                  FROM workitems 
                  WHERE [System.AssignedTo] = @Me 
                  AND ([System.State] <> 'Closed' 
                       OR [System.ClosedDate] >= @Today - 7)`;
                }
                command = `az boards query --wiql "${query}" --output json`;
                const { stdout } = await execAsync(command);
                const items = JSON.parse(stdout);
                // Group by state
                const grouped = {};
                items.forEach((item) => {
                    const state = item.fields?.['System.State'] || 'Unknown';
                    if (!grouped[state])
                        grouped[state] = [];
                    grouped[state].push({
                        id: item.id,
                        type: item.fields?.['System.WorkItemType'],
                        title: item.fields?.['System.Title'],
                        priority: item.fields?.['System.Priority'],
                    });
                });
                result = grouped;
                break;
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}\n\nMake sure you're logged in with 'az login' and have configured your organization with 'az devops configure --defaults organization=YOUR_ORG'`,
                },
            ],
            isError: true,
        };
    }
});
// Start the server
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
console.error('Azure Work Items MCP Server running...');
//# sourceMappingURL=index.js.map