#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { allTools } from './tools/index.js';
import * as workItemHandlers from './handlers/workitems.js';
import * as discoveryHandlers from './handlers/discovery.js';
import * as projectHandlers from './handlers/projects.js';
import * as iterationHandlers from './handlers/iterations.js';

// Create server
const server = new Server(
    {
        name: 'azure-devops-mcp',
        version: '2.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register all 26 tools using the modular definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
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
            // Work Item Operations (6 tools)
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

            // Discovery Operations (9 tools)
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

            // Project Operations (6 tools)
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

            // Query Operations removed - 5 tools removed

            // Iteration Operations (5 tools)
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

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        // For handlers that return HandlerResult
        if (result && result.content) {
            return result;
        }

        // For raw results (shouldn't happen with proper handlers)
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
    console.error('Azure DevOps MCP Server v2.1.0 running with 26 tools enabled...');
}

main().catch(console.error);
