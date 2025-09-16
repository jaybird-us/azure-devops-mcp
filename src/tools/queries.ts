import { ToolDefinition } from '../types.js';

export const queryTools: ToolDefinition[] = [
    {
        name: 'list_saved_queries',
        description: 'List saved queries in Azure DevOps',
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
        description: 'Run a saved query by ID',
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
                name: { type: 'string', description: 'New query name (optional)' },
                wiql: { type: 'string', description: 'New WIQL query string (optional)' },
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
];