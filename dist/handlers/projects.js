import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
const execAsync = promisify(exec);
export async function handleListProjects(args) {
    try {
        const org = await ensureOrgConfigured();
        const command = `az devops project list --organization "${org}" --output json`;
        const { stdout } = await execAsync(command);
        const projects = JSON.parse(stdout);
        const result = projects.value?.map((proj) => ({
            name: proj.name,
            id: proj.id,
            description: proj.description,
            state: proj.state,
            visibility: proj.visibility,
        })) || projects;
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                }],
        };
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Failed to list projects',
                        message: error.message
                    }, null, 2),
                }],
            isError: true,
        };
    }
}
export async function handleGetProject(args) {
    await ensureOrgConfigured();
    const command = `az devops project show --project "${args.project}" --output json`;
    const { stdout } = await execAsync(command);
    const project = JSON.parse(stdout);
    const result = {
        name: project.name,
        id: project.id,
        description: project.description,
        url: project.url,
        state: project.state,
        revision: project.revision,
        visibility: project.visibility,
        lastUpdateTime: project.lastUpdateTime,
        capabilities: project.capabilities,
        defaultTeam: project.defaultTeam,
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleListProjectTeams(args) {
    await ensureOrgConfigured();
    const command = `az devops team list --project "${args.project}" --output json`;
    const { stdout } = await execAsync(command);
    const teams = JSON.parse(stdout);
    const result = teams.value?.map((team) => ({
        name: team.name,
        id: team.id,
        description: team.description,
        identityUrl: team.identityUrl,
        projectName: team.projectName,
    })) || teams;
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleListProjectRepos(args) {
    await ensureOrgConfigured();
    const command = `az repos list --project "${args.project}" --output json`;
    const { stdout } = await execAsync(command);
    const repos = JSON.parse(stdout);
    const result = repos.value?.map((repo) => ({
        name: repo.name,
        id: repo.id,
        defaultBranch: repo.defaultBranch,
        size: repo.size,
        remoteUrl: repo.remoteUrl,
        sshUrl: repo.sshUrl,
        webUrl: repo.webUrl,
        isDisabled: repo.isDisabled,
    })) || repos;
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleListProjectPipelines(args) {
    await ensureOrgConfigured();
    const command = `az pipelines list --project "${args.project}" --output json`;
    const { stdout } = await execAsync(command);
    const pipelines = JSON.parse(stdout);
    const result = Array.isArray(pipelines) ? pipelines.map((pipeline) => ({
        name: pipeline.name,
        id: pipeline.id,
        folder: pipeline.folder,
        revision: pipeline.revision,
    })) : pipelines;
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleGetProjectStats(args) {
    await ensureOrgConfigured();
    let query = `SELECT [System.Id], [System.WorkItemType], [System.State], [System.AssignedTo] 
               FROM workitems 
               WHERE [System.TeamProject] = '${args.project}'`;
    if (!args.include_closed) {
        query += ` AND [System.State] <> 'Closed' AND [System.State] <> 'Removed'`;
    }
    const command = `az boards query --wiql "${query}" --output json`;
    const { stdout } = await execAsync(command);
    const items = JSON.parse(stdout);
    const stats = {
        project: args.project,
        totalItems: items.length,
        byType: {},
        byState: {},
        byAssignee: {},
        unassigned: 0,
    };
    items.forEach((item) => {
        const type = item.fields?.['System.WorkItemType'] || 'Unknown';
        const state = item.fields?.['System.State'] || 'Unknown';
        const assignee = item.fields?.['System.AssignedTo']?.displayName;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.byState[state] = (stats.byState[state] || 0) + 1;
        if (assignee) {
            stats.byAssignee[assignee] = (stats.byAssignee[assignee] || 0) + 1;
        }
        else {
            stats.unassigned++;
        }
    });
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(stats, null, 2),
            }],
    };
}
