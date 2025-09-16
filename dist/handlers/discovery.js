import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
const execAsync = promisify(exec);
export async function handleDiscoverFields(args) {
    await ensureOrgConfigured();
    const command = `az boards work-item field list --output json`;
    const { stdout } = await execAsync(command);
    const fields = JSON.parse(stdout);
    const grouped = {
        system_fields: [],
        microsoft_vsts: [],
        custom_fields: [],
        other_fields: []
    };
    fields.forEach((field) => {
        const fieldInfo = {
            referenceName: field.referenceName,
            name: field.name,
            type: field.type,
            readOnly: field.readOnly,
            supportedOperations: field.supportedOperations
        };
        if (field.referenceName.startsWith('System.')) {
            grouped.system_fields.push(fieldInfo);
        }
        else if (field.referenceName.startsWith('Microsoft.VSTS.')) {
            grouped.microsoft_vsts.push(fieldInfo);
        }
        else if (field.referenceName.startsWith('Custom.')) {
            grouped.custom_fields.push(fieldInfo);
        }
        else {
            grouped.other_fields.push(fieldInfo);
        }
    });
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(grouped, null, 2),
            }],
    };
}
export async function handleInspectWorkItem(args) {
    await ensureOrgConfigured();
    const command = `az boards work-item show --id ${args.id} --output json`;
    const { stdout } = await execAsync(command);
    const workItem = JSON.parse(stdout);
    const result = {
        raw_data: workItem,
        field_summary: Object.keys(workItem.fields || {}).map(key => ({
            field: key,
            value: workItem.fields[key],
            type: typeof workItem.fields[key]
        })),
        relations: workItem.relations,
        links: workItem._links,
        url: workItem.url
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleTestQuery(args) {
    await ensureOrgConfigured();
    const command = `az boards query --wiql "${args.query}" --output json`;
    const { stdout } = await execAsync(command);
    const queryResult = JSON.parse(stdout);
    let result;
    if (args.show_raw) {
        result = queryResult;
    }
    else {
        result = {
            count: queryResult.length,
            sample: queryResult.slice(0, 3),
            available_fields: queryResult.length > 0
                ? Object.keys(queryResult[0].fields || {})
                : [],
            query_used: args.query
        };
    }
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleDiscoverWorkItemTypes(args) {
    await ensureOrgConfigured();
    let command = `az boards work-item type list`;
    if (args.project)
        command += ` --project "${args.project}"`;
    command += ' --output json';
    const { stdout } = await execAsync(command);
    const types = JSON.parse(stdout);
    const result = types.map((type) => ({
        name: type.name,
        referenceName: type.referenceName,
        description: type.description,
        color: type.color,
        icon: type.icon,
        isDisabled: type.isDisabled,
        fields: type.fields?.map((f) => ({
            referenceName: f.referenceName,
            name: f.name,
            required: f.alwaysRequired
        }))
    }));
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2),
            }],
    };
}
export async function handleDiscoverStates(args) {
    await ensureOrgConfigured();
    let command = `az boards work-item type show --work-item-type "${args.work_item_type}"`;
    if (args.project)
        command += ` --project "${args.project}"`;
    command += ' --output json';
    try {
        const { stdout } = await execAsync(command);
        const typeInfo = JSON.parse(stdout);
        const result = {
            type: args.work_item_type,
            states: typeInfo.states?.map((s) => ({
                name: s.name,
                color: s.color,
                category: s.category
            })),
            transitions: typeInfo.transitions,
            raw: typeInfo
        };
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                }],
        };
    }
    catch (error) {
        const query = `SELECT [System.State] FROM workitems WHERE [System.WorkItemType] = '${args.work_item_type}'`;
        const { stdout: queryOut } = await execAsync(`az boards query --wiql "${query}" --output json`);
        const items = JSON.parse(queryOut);
        const states = new Set(items.map((item) => item.fields?.['System.State']));
        const result = {
            type: args.work_item_type,
            discovered_states: Array.from(states),
            note: 'States discovered from existing work items'
        };
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                }],
        };
    }
}
export async function handleDiscoverRelationships(args) {
    await ensureOrgConfigured();
    const query = `SELECT TOP 1 [System.Id] FROM workitems WHERE [System.Links.LinkCount] > 0`;
    const command = `az boards query --wiql "${query}" --output json`;
    try {
        const { stdout: queryOut } = await execAsync(command);
        const items = JSON.parse(queryOut);
        if (items.length > 0) {
            const sampleId = items[0].id;
            const { stdout: itemOut } = await execAsync(`az boards work-item relation show --id ${sampleId} --output json`);
            const relations = JSON.parse(itemOut);
            const relationTypes = new Set(relations.relations?.map((r) => r.rel));
            const result = {
                discovered_relation_types: Array.from(relationTypes),
                sample_relations: relations.relations?.slice(0, 5),
                common_types: {
                    'System.LinkTypes.Hierarchy-Forward': 'Child',
                    'System.LinkTypes.Hierarchy-Reverse': 'Parent',
                    'System.LinkTypes.Related': 'Related',
                    'System.LinkTypes.Dependency-Forward': 'Successor',
                    'System.LinkTypes.Dependency-Reverse': 'Predecessor',
                    'System.LinkTypes.Duplicate-Forward': 'Duplicate',
                    'System.LinkTypes.Duplicate-Reverse': 'Duplicate Of'
                }
            };
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
            };
        }
        else {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ message: 'No work items with relations found' }, null, 2),
                    }],
            };
        }
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Could not discover relationships',
                        hint: 'Try using inspect_work_item on an item you know has relations'
                    }, null, 2),
                }],
        };
    }
}
export async function handleCheckFieldExists(args) {
    await ensureOrgConfigured();
    try {
        const command = `az boards work-item field show --field "${args.field_name}" --output json`;
        const { stdout } = await execAsync(command);
        const field = JSON.parse(stdout);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        exists: true,
                        field: field
                    }, null, 2),
                }],
        };
    }
    catch {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        exists: false,
                        field_name: args.field_name,
                        message: 'Field does not exist in this Azure DevOps instance'
                    }, null, 2),
                }],
        };
    }
}
export async function handleGetDefaultProject(args) {
    await ensureOrgConfigured();
    try {
        const { stdout } = await execAsync('az devops configure --list --output json');
        const config = JSON.parse(stdout);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        organization: config.defaults?.organization || 'Not set',
                        project: config.defaults?.project || 'Not set',
                        defaults: config.defaults || {}
                    }, null, 2),
                }],
        };
    }
    catch {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Could not retrieve default configuration',
                        hint: 'Run: az devops configure --defaults organization=YOUR_ORG project=YOUR_PROJECT'
                    }, null, 2),
                }],
        };
    }
}
export async function handleHealthcheck(args) {
    await ensureOrgConfigured();
    const checks = {
        azure_cli: false,
        logged_in: false,
        devops_extension: false,
        default_org: false,
        default_project: false,
        can_query: false
    };
    try {
        await execAsync('az --version');
        checks.azure_cli = true;
    }
    catch {
    }
    try {
        await execAsync('az account show');
        checks.logged_in = true;
    }
    catch {
    }
    try {
        await execAsync('az devops --help');
        checks.devops_extension = true;
    }
    catch {
    }
    try {
        const { stdout: configOut } = await execAsync('az devops configure --list --output json');
        const config = JSON.parse(configOut);
        checks.default_org = !!config.defaults?.organization;
        checks.default_project = !!config.defaults?.project;
    }
    catch {
    }
    try {
        await execAsync('az boards query --wiql "SELECT [System.Id] FROM workitems WHERE [System.Id] = 1" --output json');
        checks.can_query = true;
    }
    catch {
    }
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    checks,
                    all_good: Object.values(checks).every(v => v),
                    message: Object.values(checks).every(v => v)
                        ? 'All systems operational'
                        : 'Some checks failed - review configuration'
                }, null, 2),
            }],
    };
}
