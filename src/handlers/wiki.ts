import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
import { HandlerResult } from '../types.js';

const execAsync = promisify(exec);

/**
 * Build org flag for Azure CLI commands
 */
async function getOrgFlag(orgOverride?: string): Promise<string> {
    const org = await ensureOrgConfigured(orgOverride);
    return `--organization "${org}"`;
}

/**
 * Get default project from Azure CLI config
 */
async function getDefaultProject(): Promise<string | null> {
    try {
        const { stdout } = await execAsync('az devops configure --list --output json');
        const config = JSON.parse(stdout);
        return config.defaults?.project || null;
    } catch {
        return null;
    }
}

/**
 * Build project flag, using default if not specified
 */
async function getProjectFlag(project?: string): Promise<string> {
    const projectName = project || await getDefaultProject();
    return projectName ? `--project "${projectName}"` : '';
}

export async function handleListWikis(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    let command = `az devops wiki list ${orgFlag}`;
    if (projectFlag) command += ` ${projectFlag}`;
    if (args.scope) command += ` --scope ${args.scope}`;
    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const wikis = JSON.parse(stdout);

        const formatted = Array.isArray(wikis) ? wikis.map((wiki: any) => ({
            id: wiki.id,
            name: wiki.name,
            type: wiki.type,
            url: wiki.url,
            remoteUrl: wiki.remoteUrl,
        })) : wikis;

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(formatted, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to list wikis: ${error.message}`,
                    hint: 'Ensure you have access to the project and wikis exist.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleGetWiki(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    let command = `az devops wiki show ${orgFlag} --wiki "${args.wiki}"`;
    if (projectFlag) command += ` ${projectFlag}`;
    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const wiki = JSON.parse(stdout);

        const formatted = {
            id: wiki.id,
            name: wiki.name,
            type: wiki.type,
            url: wiki.url,
            remoteUrl: wiki.remoteUrl,
            repositoryId: wiki.repositoryId,
            mappedPath: wiki.mappedPath,
            version: wiki.versions?.[0]?.version,
        };

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(formatted, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to get wiki: ${error.message}`,
                    hint: 'Ensure the wiki name or ID is correct.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleCreateWiki(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    let command = `az devops wiki create ${orgFlag} --name "${args.name}"`;
    if (projectFlag) command += ` ${projectFlag}`;

    const wikiType = args.type || 'projectwiki';
    command += ` --type ${wikiType}`;

    // Code wiki requires additional parameters
    if (wikiType === 'codewiki') {
        if (!args.repository || !args.branch || !args.mapped_path) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Code wikis require repository, branch, and mapped_path parameters',
                        hint: 'Provide --repository, --branch, and --mapped_path for codewiki type.',
                    }, null, 2),
                }],
                isError: true,
            };
        }
        command += ` --repository "${args.repository}" --version "${args.branch}" --mapped-path "${args.mapped_path}"`;
    }

    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const wiki = JSON.parse(stdout);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Created wiki "${args.name}"`,
                    id: wiki.id,
                    name: wiki.name,
                    type: wiki.type,
                    url: wiki.url,
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to create wiki: ${error.message}`,
                    hint: 'Ensure you have permissions to create wikis in this project.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleDeleteWiki(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    let command = `az devops wiki delete ${orgFlag} --wiki "${args.wiki}" --yes`;
    if (projectFlag) command += ` ${projectFlag}`;
    command += ' --output json';

    try {
        await execAsync(command);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Deleted wiki "${args.wiki}"`,
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to delete wiki: ${error.message}`,
                    hint: 'Ensure the wiki exists and you have permissions to delete it.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleGetWikiPage(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    let command = `az devops wiki page show ${orgFlag} --wiki "${args.wiki}" --path "${args.path}"`;
    if (projectFlag) command += ` ${projectFlag}`;

    // Default to including content
    const includeContent = args.include_content !== false;
    if (includeContent) {
        command += ' --include-content';
    }

    if (args.recursion_level) {
        command += ` --recursion-level ${args.recursion_level}`;
    }

    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const page = JSON.parse(stdout);

        const formatted = {
            path: page.page?.path,
            version: page.eTag,
            content: page.page?.content,
            subPages: page.page?.subPages?.map((sp: any) => sp.path),
            url: page.page?.url,
            gitItemPath: page.page?.gitItemPath,
        };

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(formatted, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to get wiki page: ${error.message}`,
                    hint: 'Ensure the wiki and page path are correct.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleCreateWikiPage(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    // Write content to temp file to handle large/complex content
    const tempFile = join(tmpdir(), `wiki-page-${Date.now()}.md`);
    writeFileSync(tempFile, args.content, 'utf-8');

    let command = `az devops wiki page create ${orgFlag} --wiki "${args.wiki}" --path "${args.path}" --file-path "${tempFile}" --encoding utf-8`;
    if (projectFlag) command += ` ${projectFlag}`;
    if (args.comment) command += ` --comment "${args.comment.replace(/"/g, '\\"')}"`;
    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const page = JSON.parse(stdout);

        // Clean up temp file
        try { unlinkSync(tempFile); } catch { }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Created wiki page "${args.path}"`,
                    path: page.page?.path || page.path,
                    version: page.eTag,
                    url: page.page?.url || page.url,
                }, null, 2),
            }],
        };
    } catch (error: any) {
        // Clean up temp file on error
        try { unlinkSync(tempFile); } catch { }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to create wiki page: ${error.message}`,
                    hint: 'Ensure the wiki exists and the path is valid.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleUpdateWikiPage(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    // Write content to temp file to handle large/complex content
    const tempFile = join(tmpdir(), `wiki-page-${Date.now()}.md`);
    writeFileSync(tempFile, args.content, 'utf-8');

    let command = `az devops wiki page update ${orgFlag} --wiki "${args.wiki}" --path "${args.path}" --version "${args.version}" --file-path "${tempFile}" --encoding utf-8`;
    if (projectFlag) command += ` ${projectFlag}`;
    if (args.comment) command += ` --comment "${args.comment.replace(/"/g, '\\"')}"`;
    command += ' --output json';

    try {
        const { stdout } = await execAsync(command);
        const page = JSON.parse(stdout);

        // Clean up temp file
        try { unlinkSync(tempFile); } catch { }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Updated wiki page "${args.path}"`,
                    path: page.page?.path || page.path,
                    version: page.eTag,
                    url: page.page?.url || page.url,
                }, null, 2),
            }],
        };
    } catch (error: any) {
        // Clean up temp file on error
        try { unlinkSync(tempFile); } catch { }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to update wiki page: ${error.message}`,
                    hint: 'Ensure the version (ETag) is current. Get the latest version with get_wiki_page first.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleDeleteWikiPage(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const projectFlag = await getProjectFlag(args.project);

    let command = `az devops wiki page delete ${orgFlag} --wiki "${args.wiki}" --path "${args.path}" --yes`;
    if (projectFlag) command += ` ${projectFlag}`;
    if (args.comment) command += ` --comment "${args.comment.replace(/"/g, '\\"')}"`;
    command += ' --output json';

    try {
        await execAsync(command);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Deleted wiki page "${args.path}"`,
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to delete wiki page: ${error.message}`,
                    hint: 'Ensure the wiki and page path are correct.',
                }, null, 2),
            }],
            isError: true,
        };
    }
}
