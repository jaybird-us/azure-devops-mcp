export const discoveryTools = [
    {
        name: 'discover_fields',
        description: 'Discover all available fields in the Azure DevOps instance',
        inputSchema: {
            type: 'object',
            properties: {
                work_item_type: {
                    type: 'string',
                    description: 'Optional: Filter fields for specific work item type (Task, Bug, etc.)'
                },
            },
        },
    },
    {
        name: 'discover_work_item_types',
        description: 'List all work item types and their configurations',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name (optional)' },
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
            },
            required: ['work_item_type'],
        },
    },
    {
        name: 'discover_relationships',
        description: 'Discover relationship types and link types available',
        inputSchema: {
            type: 'object',
            properties: {},
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
            },
            required: ['field_name'],
        },
    },
    {
        name: 'get_default_project',
        description: 'Get the currently configured default project and organization',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'healthcheck',
        description: 'Check Azure DevOps connection and configuration status',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
];
