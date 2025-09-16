import { ToolDefinition } from '../types.js';

export const projectTools: ToolDefinition[] = [
    {
        name: 'list_projects',
        description: 'List all projects in the Azure DevOps organization',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_project',
        description: 'Get detailed information about a specific project',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name or ID' },
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
            },
            required: ['project'],
        },
    },
];