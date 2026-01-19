import { ToolDefinition } from '../types.js';

export const organizationTools: ToolDefinition[] = [
    {
        name: 'list_organizations',
        description: 'List all Azure DevOps organizations accessible to the current user. Discovers orgs from Azure CLI account and any configured defaults.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_organization',
        description: 'Get the currently active Azure DevOps organization',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'set_organization',
        description: 'Switch to a different Azure DevOps organization for subsequent commands',
        inputSchema: {
            type: 'object',
            properties: {
                organization: {
                    type: 'string',
                    description: 'Organization name or URL (e.g., "myorg" or "https://dev.azure.com/myorg")'
                },
            },
            required: ['organization'],
        },
    },
];
