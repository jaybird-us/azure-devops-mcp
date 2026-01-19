import { ToolDefinition } from '../types.js';

const orgParam = {
    type: 'string',
    description: 'Organization name or URL (optional, uses current org if not specified)'
};

export const discoveryTools: ToolDefinition[] = [
    {
        name: 'discover_fields',
        description: 'Discover available fields in Azure DevOps (compact output with filtering)',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Filter by category: system, vsts, custom, or other'
                },
                search: {
                    type: 'string',
                    description: 'Search for fields by name or reference'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of fields to return (default: 50)'
                },
                verbose: {
                    type: 'boolean',
                    description: 'Include full details including operations (default: false)'
                },
                organization: orgParam,
            },
        },
    },
    {
        name: 'discover_work_item_types',
        description: 'List all work item types with compact field summaries',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name (optional)' },
                include_fields: {
                    type: 'boolean',
                    description: 'Include field details for each type (default: false)'
                },
                organization: orgParam,
            },
        },
    },
    {
        name: 'inspect_work_item',
        description: 'Get RAW complete work item data to see all fields and values',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Work item ID' },
                organization: orgParam,
            },
            required: ['id'],
        },
    },
    {
        name: 'discover_states',
        description: 'Discover valid states and transitions for work item types',
        inputSchema: {
            type: 'object',
            properties: {
                work_item_type: { type: 'string', description: 'Work item type (Task, Bug, etc.)' },
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
            },
            required: ['work_item_type'],
        },
    },
    {
        name: 'discover_relationships',
        description: 'Discover relationship types and link types available',
        inputSchema: {
            type: 'object',
            properties: {
                organization: orgParam,
            },
        },
    },
    {
        name: 'test_query',
        description: 'Test a WIQL query and show raw results to understand data structure',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'WIQL query to test' },
                show_raw: { type: 'boolean', description: 'Show completely raw JSON response' },
                organization: orgParam,
            },
            required: ['query'],
        },
    },
    {
        name: 'check_field_exists',
        description: 'Check if a specific field exists in Azure DevOps',
        inputSchema: {
            type: 'object',
            properties: {
                field_name: { type: 'string', description: 'Field reference name (e.g. System.Priority)' },
                organization: orgParam,
            },
            required: ['field_name'],
        },
    },
    {
        name: 'get_default_project',
        description: 'Get the currently configured default project and organization',
        inputSchema: {
            type: 'object',
            properties: {
                organization: orgParam,
            },
        },
    },
    {
        name: 'healthcheck',
        description: 'Check Azure DevOps connection and configuration status',
        inputSchema: {
            type: 'object',
            properties: {
                organization: orgParam,
            },
        },
    },
];
