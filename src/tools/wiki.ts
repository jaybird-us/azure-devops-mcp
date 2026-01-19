import { ToolDefinition } from '../types.js';

const orgParam = {
    type: 'string',
    description: 'Organization name or URL (optional, uses current org if not specified)'
};

export const wikiTools: ToolDefinition[] = [
    {
        name: 'list_wikis',
        description: 'List all wikis in a project or organization',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name (optional, lists project wikis by default)' },
                scope: {
                    type: 'string',
                    enum: ['project', 'organization'],
                    description: 'List wikis at project or organization level (default: project)'
                },
                organization: orgParam,
            },
        },
    },
    {
        name: 'get_wiki',
        description: 'Get details of a specific wiki',
        inputSchema: {
            type: 'object',
            properties: {
                wiki: { type: 'string', description: 'Name or ID of the wiki' },
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
            },
            required: ['wiki'],
        },
    },
    {
        name: 'create_wiki',
        description: 'Create a new wiki. Use type "projectwiki" for a simple project wiki, or "codewiki" to publish from a repository folder.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Name of the new wiki' },
                type: {
                    type: 'string',
                    enum: ['projectwiki', 'codewiki'],
                    description: 'Type of wiki (default: projectwiki)'
                },
                project: { type: 'string', description: 'Project name (optional)' },
                repository: { type: 'string', description: '[codewiki only] Repository name or ID to publish from' },
                branch: { type: 'string', description: '[codewiki only] Branch name to publish from' },
                mapped_path: { type: 'string', description: '[codewiki only] Folder path to publish (e.g., "/" for root, "/docs" for docs folder)' },
                organization: orgParam,
            },
            required: ['name'],
        },
    },
    {
        name: 'delete_wiki',
        description: 'Delete a wiki',
        inputSchema: {
            type: 'object',
            properties: {
                wiki: { type: 'string', description: 'Name or ID of the wiki to delete' },
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
            },
            required: ['wiki'],
        },
    },
    {
        name: 'get_wiki_page',
        description: 'Get the content of a wiki page',
        inputSchema: {
            type: 'object',
            properties: {
                wiki: { type: 'string', description: 'Name or ID of the wiki' },
                path: { type: 'string', description: 'Path of the wiki page (e.g., "/Home", "/docs/setup")' },
                project: { type: 'string', description: 'Project name (optional)' },
                include_content: {
                    type: 'boolean',
                    description: 'Include the page content in response (default: true)'
                },
                recursion_level: {
                    type: 'string',
                    enum: ['none', 'oneLevel', 'full'],
                    description: 'Include subpages: none, oneLevel, or full (default: none)'
                },
                organization: orgParam,
            },
            required: ['wiki', 'path'],
        },
    },
    {
        name: 'create_wiki_page',
        description: 'Create a new wiki page',
        inputSchema: {
            type: 'object',
            properties: {
                wiki: { type: 'string', description: 'Name or ID of the wiki' },
                path: { type: 'string', description: 'Path for the new page (e.g., "/Setup Guide", "/docs/api")' },
                content: { type: 'string', description: 'Content of the wiki page (Markdown)' },
                comment: { type: 'string', description: 'Commit message (optional)' },
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
            },
            required: ['wiki', 'path', 'content'],
        },
    },
    {
        name: 'update_wiki_page',
        description: 'Update an existing wiki page. Requires the page version (ETag) which can be obtained from get_wiki_page.',
        inputSchema: {
            type: 'object',
            properties: {
                wiki: { type: 'string', description: 'Name or ID of the wiki' },
                path: { type: 'string', description: 'Path of the wiki page to update' },
                content: { type: 'string', description: 'New content for the wiki page (Markdown)' },
                version: { type: 'string', description: 'Version (ETag) of the page to update - get this from get_wiki_page' },
                comment: { type: 'string', description: 'Commit message (optional)' },
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
            },
            required: ['wiki', 'path', 'content', 'version'],
        },
    },
    {
        name: 'delete_wiki_page',
        description: 'Delete a wiki page',
        inputSchema: {
            type: 'object',
            properties: {
                wiki: { type: 'string', description: 'Name or ID of the wiki' },
                path: { type: 'string', description: 'Path of the wiki page to delete' },
                comment: { type: 'string', description: 'Commit message (optional)' },
                project: { type: 'string', description: 'Project name (optional)' },
                organization: orgParam,
            },
            required: ['wiki', 'path'],
        },
    },
];
