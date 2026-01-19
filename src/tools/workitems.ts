import { ToolDefinition } from '../types.js';

const orgParam = {
    type: 'string',
    description: 'Organization name or URL (optional, uses current org if not specified)'
};

export const workItemTools: ToolDefinition[] = [
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
                organization: orgParam,
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
                organization: orgParam,
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
                organization: orgParam,
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
                fields: {
                    type: 'object',
                    description: 'Arbitrary fields to update. Keys are field reference names (e.g., "Microsoft.VSTS.CMMI.Analysis"), values are the field values. Use discover_fields tool to find available field names.',
                    additionalProperties: true
                },
                organization: orgParam,
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
                organization: orgParam,
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
                organization: orgParam,
            },
        },
    },
];
