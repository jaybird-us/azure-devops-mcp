import { ToolDefinition } from '../types.js';

export const iterationTools: ToolDefinition[] = [
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
    }
];
