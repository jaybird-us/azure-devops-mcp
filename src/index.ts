#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import * as workItemHandlers from './handlers/workitems.js';
import * as discoveryHandlers from './handlers/discovery.js';
import * as projectHandlers from './handlers/projects.js';
import * as queryHandlers from './handlers/queries.js';
import * as iterationHandlers from './handlers/iterations.js';

// Create server
const server = new Server(
    {
        name: 'azure-devops-mcp',
        version: '2.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register all 31 tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        // ========== WORK ITEM TOOLS (6) ==========
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
                    title: { type: 'string', description: 'Work item title' },
                    description: { type: 'string', description: 'Work item description (optional)' },
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
                    id: { type: 'number', description: 'Work item ID' },
                    title: { type: 'string', description: 'New title (optional)' },
                    state: {
                        type: 'string',
                        enum: ['New', 'Active', 'Resolved', 'Closed', 'Removed'],
                        description: 'Work item state (optional)'
                    },
                    assigned_to: { type: 'string', description: 'Email or @Me (optional)' },
                    description: { type: 'string', description: 'New description (optional)' },
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

        // ========== DISCOVERY TOOLS (9) ==========
        {
            name: 'discover_fields',
            description: 'List all available fields in Azure DevOps, grouped by category',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'inspect_work_item',
            description: 'Get the complete raw data structure of a work item including all fields and relations',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'number', description: 'Work item ID to inspect' },
                },
                required: ['id'],
            },
        },
        {
            name: 'test_query',
            description: 'Test a WIQL query and see sample results',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'WIQL query to test' },
                    show_raw: { 
                        type: 'boolean', 
                        description: 'Show raw results instead of formatted (optional)' 
                    },
                },
                required: ['query'],
            },
        },
        {
            name: 'discover_work_item_types',
            description: 'List all available work item types in the organization',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name (optional)' },
                },
            },
        },
        {
            name: 'discover_states',
            description: 'Discover valid states for a specific work item type',
            inputSchema: {
                type: 'object',
                properties: {
                    work_item_type: {
                        type: 'string',
                        description: 'Work item type (e.g., "Bug", "Task", "User Story")'
                    },
                    project: { type: 'string', description: 'Project name (optional)' },
                },
                required: ['work_item_type'],
            },
        },
        {
            name: 'discover_relationships',
            description: 'Discover available link types between work items',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'check_field_exists',
            description: 'Check if a specific field exists in Azure DevOps',
            inputSchema: {
                type: 'object',
                properties: {
                    field_name: { 
                        type: 'string', 
                        description: 'Field name to check (e.g., "System.Title")' 
                    },
                },
                required: ['field_name'],
            },
        },
        {
            name: 'get_default_project',
            description: 'Get the default Azure DevOps organization and project configuration',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'healthcheck',
            description: 'Check Azure DevOps connection health and configuration status',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },

        // ========== PROJECT TOOLS (6) ==========
        {
            name: 'list_projects',
            description: 'List all projects in the Azure DevOps organization',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'get_project',
            description: 'Get detailed information about a specific project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                },
                required: ['project'],
            },
        },
        {
            name: 'list_project_teams',
            description: 'List all teams in a project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                },
                required: ['project'],
            },
        },
        {
            name: 'list_project_repos',
            description: 'List all Git repositories in a project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                },
                required: ['project'],
            },
        },
        {
            name: 'list_project_pipelines',
            description: 'List all CI/CD pipelines in a project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                },
                required: ['project'],
            },
        },
        {
            name: 'get_project_stats',
            description: 'Get statistics about work items in a project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                    include_closed: { 
                        type: 'boolean', 
                        description: 'Include closed and removed items (default: false)' 
                    },
                },
                required: ['project'],
            },
        },

        // ========== QUERY TOOLS (5) ==========
        {
            name: 'list_saved_queries',
            description: 'List saved queries in a project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name (optional)' },
                    folder: { type: 'string', description: 'Folder path (optional)' },
                },
            },
        },
        {
            name: 'run_saved_query',
            description: 'Execute a saved query by ID',
            inputSchema: {
                type: 'object',
                properties: {
                    query_id: { type: 'string', description: 'Query ID' },
                    project: { type: 'string', description: 'Project name (optional)' },
                },
                required: ['query_id'],
            },
        },
        {
            name: 'create_saved_query',
            description: 'Create a new saved query',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Query name' },
                    wiql: { type: 'string', description: 'WIQL query string' },
                    project: { type: 'string', description: 'Project name (optional)' },
                    folder: { type: 'string', description: 'Folder path (optional)' },
                    description: { type: 'string', description: 'Query description (optional)' },
                },
                required: ['name', 'wiql'],
            },
        },
        {
            name: 'update_saved_query',
            description: 'Update an existing saved query',
            inputSchema: {
                type: 'object',
                properties: {
                    query_id: { type: 'string', description: 'Query ID' },
                    name: { type: 'string', description: 'New name (optional)' },
                    wiql: { type: 'string', description: 'New WIQL query (optional)' },
                    description: { type: 'string', description: 'New description (optional)' },
                },
                required: ['query_id'],
            },
        },
        {
            name: 'delete_saved_query',
            description: 'Delete a saved query',
            inputSchema: {
                type: 'object',
                properties: {
                    query_id: { type: 'string', description: 'Query ID to delete' },
                },
                required: ['query_id'],
            },
        },

        // ========== ITERATION TOOLS (6) ==========
        {
            name: 'list_iterations',
            description: 'List all iterations/sprints in a project',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                    team: { type: 'string', description: 'Team name (optional)' },
                    depth: { type: 'number', description: 'Depth of iteration tree (optional)' }
                },
                required: ['project']
            }
        },
        {
            name: 'get_current_iteration',
            description: 'Get the current active sprint/iteration',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                    team: { type: 'string', description: 'Team name (optional)' }
                },
                required: ['project']
            }
        },
        {
            name: 'get_iteration_work_items',
            description: 'Get all work items in a specific iteration',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                    iteration: { type: 'string', description: 'Iteration name or path' }
                },
                required: ['project', 'iteration']
            }
        },
        {
            name: 'move_to_iteration',
            description: 'Move a work item to a different iteration/sprint',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'number', description: 'Work item ID' },
                    iteration: { type: 'string', description: 'Target iteration name' },
                    project: { type: 'string', description: 'Project name (optional)' }
                },
                required: ['id', 'iteration']
            }
        },
        {
            name: 'get_iteration_details',
            description: 'Get detailed information about an iteration including work items grouped by type and state',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                    iteration: { type: 'string', description: 'Iteration name' }
                },
                required: ['project', 'iteration']
            }
        },
        {
            name: 'get_iteration_capacity',
            description: 'Get iteration capacity and team information',
            inputSchema: {
                type: 'object',
                properties: {
                    project: { type: 'string', description: 'Project name' },
                    iteration: { type: 'string', description: 'Iteration name' },
                    team: { type: 'string', description: 'Team name (optional)' }
                },
                required: ['project', 'iteration']
            }
        },
    ],
}));

// Handle tool calls using modular handlers
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
        let result: any;

        switch (name) {
            // Work Item Operations
            case 'query_work_items':
                result = await workItemHandlers.handleQueryWorkItems(args);
                break;
            case 'get_work_item':
                result = await workItemHandlers.handleGetWorkItem(args);
                break;
            case 'create_work_item':
                result = await workItemHandlers.handleCreateWorkItem(args);
                break;
            case 'update_work_item':
                result = await workItemHandlers.handleUpdateWorkItem(args);
                break;
            case 'add_comment':
                result = await workItemHandlers.handleAddComment(args);
                break;
            case 'list_my_work':
                result = await workItemHandlers.handleListMyWork(args);
                break;

            // Discovery Operations
            case 'discover_fields':
                result = await discoveryHandlers.handleDiscoverFields(args);
                break;
            case 'inspect_work_item':
                result = await discoveryHandlers.handleInspectWorkItem(args);
                break;
            case 'test_query':
                result = await discoveryHandlers.handleTestQuery(args);
                break;
            case 'discover_work_item_types':
                result = await discoveryHandlers.handleDiscoverWorkItemTypes(args);
                break;
            case 'discover_states':
                result = await discoveryHandlers.handleDiscoverStates(args);
                break;
            case 'discover_relationships':
                result = await discoveryHandlers.handleDiscoverRelationships(args);
                break;
            case 'check_field_exists':
                result = await discoveryHandlers.handleCheckFieldExists(args);
                break;
            case 'get_default_project':
                result = await discoveryHandlers.handleGetDefaultProject(args);
                break;
            case 'healthcheck':
                result = await discoveryHandlers.handleHealthcheck(args);
                break;

            // Project Operations
            case 'list_projects':
                result = await projectHandlers.handleListProjects(args);
                break;
            case 'get_project':
                result = await projectHandlers.handleGetProject(args);
                break;
            case 'list_project_teams':
                result = await projectHandlers.handleListProjectTeams(args);
                break;
            case 'list_project_repos':
                result = await projectHandlers.handleListProjectRepos(args);
                break;
            case 'list_project_pipelines':
                result = await projectHandlers.handleListProjectPipelines(args);
                break;
            case 'get_project_stats':
                result = await projectHandlers.handleGetProjectStats(args);
                break;

            // Query Operations
            case 'list_saved_queries':
                result = await queryHandlers.handleListSavedQueries(args);
                break;
            case 'run_saved_query':
                result = await queryHandlers.handleRunSavedQuery(args);
                break;
            case 'create_saved_query':
                result = await queryHandlers.handleCreateSavedQuery(args);
                break;
            case 'update_saved_query':
                result = await queryHandlers.handleUpdateSavedQuery(args);
                break;
            case 'delete_saved_query':
                result = await queryHandlers.handleDeleteSavedQuery(args);
                break;

            // Iteration Operations
            case 'list_iterations':
                result = await iterationHandlers.listIterations(args as any);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
                };
            case 'get_current_iteration':
                result = await iterationHandlers.getCurrentIteration(args as any);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
                };
            case 'get_iteration_work_items':
                result = await iterationHandlers.getIterationWorkItems(args as any);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
                };
            case 'move_to_iteration':
                result = await iterationHandlers.moveToIteration(args as any);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
                };
            case 'get_iteration_details':
                result = await iterationHandlers.getIterationDetails(args as any);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
                };
            case 'get_iteration_capacity':
                result = await iterationHandlers.getIterationCapacity(args as any);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
                };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        // For handlers that return HandlerResult
        if (result && result.content) {
            return result;
        }

        // For raw results
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
                    text: `Error: ${error.message}\n\nMake sure you're logged in with 'az login' and have configured your organization. See 'healthcheck' tool for diagnostics.`,
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
    console.error('Azure DevOps MCP Server v2.0.0 running with all 31 tools enabled...');
}

main().catch(console.error);
