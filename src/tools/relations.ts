import { ToolDefinition } from '../types.js';

const orgParam = {
    type: 'string',
    description: 'Organization name or URL (optional, uses current org if not specified)'
};

export const relationTools: ToolDefinition[] = [
    {
        name: 'add_work_item_relation',
        description: 'Add a relationship between work items',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Source work item ID'
                },
                relation_type: {
                    type: 'string',
                    description: 'Relation type (e.g., "Parent", "Child", "Related", "Predecessor", "Successor", "Duplicate")'
                },
                target_id: {
                    oneOf: [
                        { type: 'number' },
                        { type: 'array', items: { type: 'number' } }
                    ],
                    description: 'Target work item ID(s) (optional if target_url is provided)'
                },
                target_url: {
                    type: 'string',
                    description: 'URL to target work item (optional if target_id is provided)'
                },
                organization: orgParam,
            },
            required: ['id', 'relation_type'],
        },
    },
    {
        name: 'remove_work_item_relation',
        description: 'Remove a relationship between work items',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Source work item ID'
                },
                relation_type: {
                    type: 'string',
                    description: 'Relation type to remove'
                },
                target_id: {
                    oneOf: [
                        { type: 'number' },
                        { type: 'array', items: { type: 'number' } }
                    ],
                    description: 'Target work item ID(s) to unlink'
                },
                organization: orgParam,
            },
            required: ['id', 'relation_type', 'target_id'],
        },
    },
    {
        name: 'get_work_item_relations',
        description: 'Show all relationships for a work item',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'number',
                    description: 'Work item ID'
                },
                organization: orgParam,
            },
            required: ['id'],
        },
    },
    {
        name: 'list_relation_types',
        description: 'List all available work item relation types',
        inputSchema: {
            type: 'object',
            properties: {
                organization: orgParam,
            },
        },
    },
];
