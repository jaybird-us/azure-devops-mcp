import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
const execAsync = promisify(exec);
export async function handleListSavedQueries(args) {
    await ensureOrgConfigured();
    let command = `az boards query list`;
    if (args.project)
        command += ` --project "${args.project}"`;
    if (args.folder)
        command += ` --path "${args.folder}"`;
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const queries = JSON.parse(stdout);
    const result = queries.value?.map((query) => ({
        name: query.name,
        id: query.id,
        path: query.path,
        queryType: query.queryType,
        isFolder: query.isFolder,
        hasChildren: query.hasChildren,
        createdBy: query.createdBy?.displayName,
        lastModifiedBy: query.lastModifiedBy?.displayName,
        lastModifiedDate: query.lastModifiedDate,
    })) || queries;
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleRunSavedQuery(args) {
    await ensureOrgConfigured();
    let getCommand = `az boards query show --id "${args.query_id}"`;
    if (args.project)
        getCommand += ` --project "${args.project}"`;
    getCommand += ' --output json';
    const { stdout: queryDef } = await execAsync(getCommand);
    const query = JSON.parse(queryDef);
    const runCommand = `az boards query --wiql "${query.wiql}" --output json`;
    const { stdout: results } = await execAsync(runCommand);
    const items = JSON.parse(results);
    const formattedItems = items.map((item) => ({
        id: item.id,
        type: item.fields?.['System.WorkItemType'],
        title: item.fields?.['System.Title'],
        state: item.fields?.['System.State'],
        assignedTo: item.fields?.['System.AssignedTo']?.displayName,
    }));
    const result = {
        queryName: query.name,
        queryPath: query.path,
        itemCount: formattedItems.length,
        items: formattedItems,
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleCreateSavedQuery(args) {
    await ensureOrgConfigured();
    let command = `az boards query create --name "${args.name}" --wiql "${args.wiql}"`;
    if (args.project)
        command += ` --project "${args.project}"`;
    if (args.folder)
        command += ` --path "${args.folder}"`;
    if (args.description)
        command += ` --description "${args.description}"`;
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const createdQuery = JSON.parse(stdout);
    const result = {
        message: `Created query: ${createdQuery.name}`,
        id: createdQuery.id,
        name: createdQuery.name,
        path: createdQuery.path,
        wiql: createdQuery.wiql,
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleUpdateSavedQuery(args) {
    await ensureOrgConfigured();
    let command = `az boards query update --id "${args.query_id}"`;
    if (args.name)
        command += ` --name "${args.name}"`;
    if (args.wiql)
        command += ` --wiql "${args.wiql}"`;
    if (args.description)
        command += ` --description "${args.description}"`;
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const updatedQuery = JSON.parse(stdout);
    const result = {
        message: `Updated query: ${updatedQuery.name}`,
        id: updatedQuery.id,
        name: updatedQuery.name,
        path: updatedQuery.path,
        wiql: updatedQuery.wiql,
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleDeleteSavedQuery(args) {
    await ensureOrgConfigured();
    const command = `az boards query delete --id "${args.query_id}" --yes --output json`;
    await execAsync(command);
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Deleted query with ID: ${args.query_id}`,
                }, null, 2),
            }],
    };
}
