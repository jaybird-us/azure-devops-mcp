import { ToolDefinition } from '../types.js';

const orgParam = {
    type: 'string',
    description: 'Organization name or URL (optional, uses current org if not specified)'
};

export const iterationTools: ToolDefinition[] = [
    {
        name: 'list_iterations',
        description: 'List all iterations/sprints in a project',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name' },
                team: { type: 'string', description: 'Team name (optional)' },
                depth: { type: 'number', description: 'Depth of iteration tree (optional)' },
                organization: orgParam,
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
                team: { type: 'string', description: 'Team name (optional)' },
                organization: orgParam,
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
                iteration: { type: 'string', description: 'Iteration name or path' },
                organization: orgParam,
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
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
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
                iteration: { type: 'string', description: 'Iteration name' },
                organization: orgParam,
            },
            required: ['project', 'iteration']
        }
    }
];
