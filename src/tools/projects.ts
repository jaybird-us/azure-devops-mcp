import { ToolDefinition } from '../types.js';

const orgParam = {
    type: 'string',
    description: 'Organization name or URL (optional, uses current org if not specified)'
};

export const projectTools: ToolDefinition[] = [
    {
        name: 'list_projects',
        description: 'List all projects in the Azure DevOps organization',
        inputSchema: {
            type: 'object',
            properties: {
                organization: orgParam,
            },
        },
    },
    {
        name: 'get_project',
        description: 'Get detailed information about a specific project',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name or ID' },
                organization: orgParam,
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
                organization: orgParam,
            },
            required: ['project'],
        },
    },
    {
        name: 'list_project_repos',
        description: 'List all repositories in a project',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name' },
                organization: orgParam,
            },
            required: ['project'],
        },
    },
    {
        name: 'list_project_pipelines',
        description: 'List all pipelines in a project',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name' },
                organization: orgParam,
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
                include_closed: { type: 'boolean', description: 'Include closed items in stats' },
                organization: orgParam,
            },
            required: ['project'],
        },
    },
];
