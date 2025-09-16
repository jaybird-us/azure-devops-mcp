#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Helper function to ensure organization is configured
async function ensureOrgConfigured(): Promise<string> {
    try {
        // Try to get the current configuration
        const { stdout: configOut } = await execAsync('az devops configure --list --output json');
        
        let org;
        try {
            const config = JSON.parse(configOut);
            org = config.defaults?.organization;
        } catch (e) {
            // If JSON parsing fails, try to parse the INI-style output
            const orgMatch = configOut.match(/organization\s*=\s*([^\s\n]+)/);
            org = orgMatch ? orgMatch[1] : null;
        }
        
        if (!org) {
            org = 'https://dev.azure.com/jybrd';
            await execAsync(`az devops configure --defaults organization=${org}`);
        }
        
        return org;
    } catch (error) {
        // If all else fails, just set the default org
        const org = 'https://dev.azure.com/jybrd';
        await execAsync(`az devops configure --defaults organization=${org}`);
        return org;
    }
}

// Type definitions for tool arguments
interface QueryWorkItemsArgs {
    query: string;
    project?: string;
}

interface GetWorkItemArgs {
    id: number;
    fields?: string;
}

interface CreateWorkItemArgs {
    type: string;
    title: string;
    description?: string;
    assigned_to?: string;
    tags?: string;
    project?: string;
}

interface UpdateWorkItemArgs {
    id: number;
    title?: string;
    state?: string;
    assigned_to?: string;
    description?: string;
    comment?: string;
}

interface AddCommentArgs {
    id: number;
    comment: string;
}

interface ListMyWorkArgs {
    include_recently_completed?: boolean;
}

// Create server
const server = new Server(
    {
        name: 'azure-workitems-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Helper function to build WIQL queries
function buildQuery(queryType: string): string {
    const queries: Record<string, string> = {
        'my-items': `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] 
                 FROM workitems 
                 WHERE [System.AssignedTo] = @Me 
                 AND [System.State] <> 'Closed' 
                 AND [System.State] <> 'Removed'
                 ORDER BY [System.CreatedDate] DESC`,

        'my-bugs': `SELECT [System.Id], [System.Title], [System.State] 
                FROM workitems 
                WHERE [System.AssignedTo] = @Me 
                AND [System.WorkItemType] = 'Bug' 
                AND [System.State] <> 'Closed'`,

        'my-tasks': `SELECT [System.Id], [System.Title], [System.State] 
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

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'list_projects',
            description: 'List all projects in the Azure DevOps organization',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
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

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Validate args exists
    if (!args) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Error: No arguments provided',
                },
            ],
            isError: true,
        };
    }

    try {
        let command: string;
        let result: any;

        // Ensure organization is configured before any operation
        await ensureOrgConfigured();
        
        switch (name) {
            case 'list_projects': {
                command = 'az devops project list --output json';
                const { stdout } = await execAsync(command);
                const projects = JSON.parse(stdout);

                // Format the project list
                result = projects.value?.map((proj: any) => ({
                    name: proj.name,
                    id: proj.id,
                    description: proj.description,
                    state: proj.state,
                    visibility: proj.visibility,
                })) || projects;
                break;
            }

            case 'query_work_items': {
                const typedArgs = args as unknown as QueryWorkItemsArgs;
                const query = buildQuery(typedArgs.query);
                command = `az boards query --wiql "${query}"`;
                if (typedArgs.project) command += ` --project "${typedArgs.project}"`;
                command += ' --output json';

                const { stdout } = await execAsync(command);
                result = JSON.parse(stdout);

                // Format the results nicely
                if (Array.isArray(result)) {
                    const formatted = result.map((item: any) => ({
                        id: item.id,
                        type: item.fields?.['System.WorkItemType'],
                        title: item.fields?.['System.Title'],
                        state: item.fields?.['System.State'],
                        assignedTo: item.fields?.['System.AssignedTo']?.displayName,
                    }));
                    result = formatted;
                }
                break;
            }

            case 'get_work_item': {
                const typedArgs = args as unknown as GetWorkItemArgs;
                // FIXED: Removed --open false flag that was causing issues
                command = `az boards work-item show --id ${typedArgs.id}`;
                if (typedArgs.fields) {
                    command += ` --fields "${typedArgs.fields}"`;
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
                    description: result.fields?.['System.Description'],
                    tags: result.fields?.['System.Tags'],
                    url: result.url,
                };
                break;
            }

            case 'create_work_item': {
                const typedArgs = args as unknown as CreateWorkItemArgs;
                command = `az boards work-item create --type "${typedArgs.type}" --title "${typedArgs.title}"`;
                
                // Check for default project if not specified
                if (!typedArgs.project) {
                    try {
                        const { stdout: configOut } = await execAsync('az devops configure --list');
                        const projectMatch = configOut.match(/project\s*=\s*([^\s\n]+)/);
                        if (projectMatch) {
                            command += ` --project "${projectMatch[1]}"`;
                        }
                    } catch {
                        // Continue without project if we can't get default
                    }
                } else {
                    command += ` --project "${typedArgs.project}"`;
                }
                
                if (typedArgs.description) {
                    const desc = typedArgs.description.replace(/"/g, '\\"');
                    command += ` --description "${desc}"`;
                }
                if (typedArgs.assigned_to) {
                    command += ` --assigned-to "${typedArgs.assigned_to}"`;
                }
                if (typedArgs.tags) {
                    command += ` --fields "System.Tags=${typedArgs.tags}"`;
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
                    message: `Created ${typedArgs.type} #${result.id}: ${typedArgs.title}`,
                };
                break;
            }

            case 'update_work_item': {
                const typedArgs = args as unknown as UpdateWorkItemArgs;
                command = `az boards work-item update --id ${typedArgs.id}`;

                if (typedArgs.title) command += ` --title "${typedArgs.title}"`;
                if (typedArgs.state) command += ` --state "${typedArgs.state}"`;
                if (typedArgs.assigned_to) command += ` --assigned-to "${typedArgs.assigned_to}"`;
                if (typedArgs.description) {
                    const desc = typedArgs.description.replace(/"/g, '\\"');
                    command += ` --description "${desc}"`;
                }
                command += ' --output json';

                const { stdout } = await execAsync(command);
                result = JSON.parse(stdout);

                // Add comment if provided
                if (typedArgs.comment) {
                    const commentCommand = `az boards work-item update --id ${typedArgs.id} --discussion "${typedArgs.comment.replace(/"/g, '\\"')}" --output json`;
                    await execAsync(commentCommand);
                }

                result = {
                    id: result.id,
                    title: result.fields?.['System.Title'],
                    state: result.fields?.['System.State'],
                    assignedTo: result.fields?.['System.AssignedTo']?.displayName,
                    message: `Updated work item #${typedArgs.id}`,
                };
                break;
            }

            case 'add_comment': {
                const typedArgs = args as unknown as AddCommentArgs;
                command = `az boards work-item update --id ${typedArgs.id} --discussion "${typedArgs.comment.replace(/"/g, '\\"')}" --output json`;

                await execAsync(command);
                result = {
                    message: `Added comment to work item #${typedArgs.id}`,
                };
                break;
            }

            case 'list_my_work': {
                const typedArgs = args as unknown as ListMyWorkArgs;
                let query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
                    FROM workitems 
                    WHERE [System.AssignedTo] = @Me 
                    AND [System.State] <> 'Closed' 
                    AND [System.State] <> 'Removed'`;

                if (typedArgs.include_recently_completed) {
                    query = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
                  FROM workitems 
                  WHERE [System.AssignedTo] = @Me 
                  AND ([System.State] <> 'Closed' 
                       OR [System.ClosedDate] >= @Today - 7)`;
                }

                command = `az boards query --wiql "${query}" --output json`;

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

    } catch (error: any) {
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

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Azure Work Items MCP Server running...');
}

main().catch(console.error);