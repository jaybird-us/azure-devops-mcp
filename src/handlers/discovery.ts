import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
import { azureDevOpsInvoke } from '../helpers/azureDevOpsInvoke.js';
import { fieldResolver } from '../helpers/fieldResolver.js';
import { HandlerResult } from '../types.js';

const execAsync = promisify(exec);

/**
 * Build org flag for Azure CLI commands
 */
async function getOrgFlag(orgOverride?: string): Promise<string> {
    const org = await ensureOrgConfigured(orgOverride);
    return `--organization "${org}"`;
}

export async function handleDiscoverFields(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured(args.organization);

    try {
        // Support filtering options
        const category = args.category?.toLowerCase(); // 'system', 'vsts', 'custom', 'other'
        const search = args.search?.toLowerCase();
        const verbose = args.verbose === true;
        const limit = args.limit || 50; // Default to showing only 50 fields unless specified

        // Use REST API to get fields
        const apiResponse = await azureDevOpsInvoke({
            area: 'wit',
            resource: 'fields',
            httpMethod: 'GET',
            organization: args.organization
        });
        
        const allFields = apiResponse.value || apiResponse || [];
        
        // Group fields by category
        const grouped: Record<string, any[]> = {
            system: [],
            vsts: [],
            custom: [],
            other: []
        };

        let processedCount = 0;
        allFields.forEach((field: any) => {
            // Apply search filter
            if (search && 
                !field.name?.toLowerCase().includes(search) && 
                !field.referenceName?.toLowerCase().includes(search)) {
                return;
            }

            // Create compact field info (no supportedOperations unless verbose)
            const fieldInfo = verbose ? {
                ref: field.referenceName,
                name: field.name,
                type: field.type,
                readOnly: field.readOnly,
                ops: field.supportedOperations // Include operations only if verbose
            } : {
                ref: field.referenceName,
                name: field.name,
                type: field.type
            };

            // Categorize the field
            let targetCategory = '';
            if (field.referenceName.startsWith('System.')) {
                targetCategory = 'system';
            } else if (field.referenceName.startsWith('Microsoft.VSTS.')) {
                targetCategory = 'vsts';
            } else if (field.referenceName.startsWith('Custom.')) {
                targetCategory = 'custom';
            } else {
                targetCategory = 'other';
            }

            // Apply category filter and add to appropriate group
            if (!category || category === targetCategory) {
                if (processedCount < limit || category || search) {
                    grouped[targetCategory].push(fieldInfo);
                    processedCount++;
                }
            }
        });

        // Build compact summary
        const summary = {
            total: allFields.length,
            shown: processedCount,
            by_category: {
                system: grouped.system.length,
                vsts: grouped.vsts.length,
                custom: grouped.custom.length,
                other: grouped.other.length
            }
        };

        // Build result with only non-empty categories
        const finalResult: any = {
            summary,
            filters: {
                category: category || 'all',
                search: search || 'none',
                limit: processedCount < allFields.length ? limit : 'all',
                verbose: verbose
            }
        };

        // Add fields by category (only non-empty)
        if (grouped.system.length > 0) finalResult.system = grouped.system;
        if (grouped.vsts.length > 0) finalResult.vsts = grouped.vsts;
        if (grouped.custom.length > 0) finalResult.custom = grouped.custom;
        if (grouped.other.length > 0) finalResult.other = grouped.other;

        // Add helpful hints if output was limited
        if (processedCount < allFields.length && !category && !search) {
            finalResult.hint = `Showing first ${limit} fields. Use parameters: category (system/vsts/custom/other), search, limit, verbose`;
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(finalResult, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Failed to discover fields',
                    message: error.message,
                    hint: 'Make sure you have access to the Azure DevOps organization'
                }, null, 2),
            }],
            isError: true
        };
    }
}

export async function handleInspectWorkItem(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    // This one still works with Azure CLI
    const command = `az boards work-item show ${orgFlag} --id ${args.id} --output json`;
    const { stdout } = await execAsync(command);
    const workItem = JSON.parse(stdout);

    // Return the complete structure so we can see ALL fields
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

export async function handleTestQuery(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const command = `az boards query ${orgFlag} --wiql "${args.query}" --output json`;
    const { stdout } = await execAsync(command);
    const queryResult = JSON.parse(stdout);

    let result;
    if (args.show_raw) {
        result = queryResult;
    } else {
        // Show structured view
        result = {
            count: queryResult.length,
            sample: queryResult.slice(0, 3), // Show first 3 items
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

export async function handleDiscoverWorkItemTypes(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured(args.organization);

    try {
        // Use REST API to get work item types
        const params: any = {
            area: 'wit',
            resource: 'workitemtypes',
            httpMethod: 'GET',
            organization: args.organization
        };

        if (args.project) {
            params.routeParameters = { project: args.project };
        }

        const result = await azureDevOpsInvoke(params);
        const types = result.value || result || [];
        
        // Format the response with field summary instead of listing all fields
        const formattedTypes = types.map((type: any) => {
            let fieldInfo = {};
            
            if (args.include_fields === true) {
                // If explicitly requested, include only required and commonly used fields
                const importantFields = ['System.Title', 'System.State', 'System.AssignedTo', 
                                         'System.Description', 'System.Priority', 'System.Tags'];
                
                fieldInfo = {
                    requiredFields: type.fields?.filter((f: any) => f.alwaysRequired)
                        .map((f: any) => ({
                            referenceName: f.referenceName,
                            name: f.name
                        }))
                        .slice(0, 10), // Limit to 10 required fields
                    commonFields: type.fields?.filter((f: any) => 
                        importantFields.includes(f.referenceName))
                        .map((f: any) => ({
                            referenceName: f.referenceName,
                            name: f.name
                        }))
                };
            } else {
                // Default: just provide field statistics
                fieldInfo = {
                    fieldCount: type.fields?.length || 0,
                    requiredFieldCount: type.fields?.filter((f: any) => f.alwaysRequired).length || 0,
                    hint: "Use include_fields parameter to see field details"
                };
            }
            
            return {
                name: type.name,
                referenceName: type.referenceName,
                description: type.description,
                color: type.color,
                icon: type.icon,
                isDisabled: type.isDisabled,
                ...fieldInfo
            };
        });
        
        // Add a summary at the top
        const summary = {
            totalTypes: formattedTypes.length,
            types: formattedTypes,
            note: "Use include_fields=true parameter to see field details for each type"
        };

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(summary, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Failed to discover work item types',
                    message: error.message,
                    hint: 'Specify a project if needed: --project "ProjectName"'
                }, null, 2),
            }],
            isError: true
        };
    }
}

export async function handleDiscoverStates(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);

    try {
        // First, we need a project context to get states
        // If no project is provided, try to get the default or first project
        let project = args.project;
        if (!project) {
            // Try to get default project
            try {
                const { stdout: configOut } = await execAsync('az devops configure --list --output json');
                const config = JSON.parse(configOut);
                project = config.defaults?.project;
            } catch {
                // No default project
            }

            // If still no project, list projects and use the first one
            if (!project) {
                try {
                    const projectList = await azureDevOpsInvoke({
                        area: 'core',
                        resource: 'projects',
                        httpMethod: 'GET',
                        organization: args.organization
                    });
                    const projects = projectList.value || projectList || [];
                    if (projects.length > 0) {
                        project = projects[0].name;
                    }
                } catch {
                    // Couldn't get projects
                }
            }
        }
        
        if (!project) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Project context required',
                        message: 'Please provide a project parameter to get states for the work item type',
                        hint: 'Example: --project "Quality Carbide"'
                    }, null, 2),
                }],
            };
        }
        
        // Use az devops invoke directly with the proper resource path
        // The resource for states should include the work item type in the path
        const command = `az devops invoke ${orgFlag} --area wit --resource "workitemtypes/${args.work_item_type}/states" --route-parameters project="${project}" --http-method GET --api-version 7.1 --output json`;
        
        try {
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);
            const states = result.value || result || [];
            
            if (Array.isArray(states) && states.length > 0) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            type: args.work_item_type,
                            project: project,
                            states: states.map((s: any) => ({
                                name: s.name,
                                color: s.color,
                                category: s.category
                            })),
                            count: states.length
                        }, null, 2),
                    }],
                };
            }
            
            // If no states returned, try alternative approach
            throw new Error('No states returned from API');
            
        } catch (apiError: any) {
            // If the direct API call fails, try to get the work item type info
            try {
                const typeCommand = `az devops invoke ${orgFlag} --area wit --resource workitemtypes --route-parameters project="${project}" --http-method GET --api-version 7.1 --output json`;
                const { stdout: typeOut } = await execAsync(typeCommand);
                const typeResult = JSON.parse(typeOut);
                const types = typeResult.value || typeResult || [];
                
                // Find the requested type
                const typeInfo = types.find((t: any) => 
                    t.name === args.work_item_type || 
                    t.referenceName === args.work_item_type
                );
                
                if (typeInfo && typeInfo.states) {
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({
                                type: args.work_item_type,
                                project: project,
                                states: typeInfo.states.map((s: any) => ({
                                    name: s.name,
                                    color: s.color,
                                    category: s.category
                                })),
                                transitions: typeInfo.transitions || [],
                                note: 'States retrieved from work item type definition'
                            }, null, 2),
                        }],
                    };
                }
            } catch {
                // This approach also failed
            }
            
            // Final fallback: discover from existing items
            const query = `SELECT [System.State] FROM workitems WHERE [System.WorkItemType] = '${args.work_item_type}' AND [System.TeamProject] = '${project}'`;
            const { stdout: queryOut } = await execAsync(`az boards query ${orgFlag} --wiql "${query}" --output json`);
            const items = JSON.parse(queryOut);

            // Get unique states from actual work items
            const statesSet = new Set(items.map((item: any) => item.fields?.['System.State']).filter(Boolean));
            
            if (statesSet.size > 0) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            type: args.work_item_type,
                            project: project,
                            discovered_states: Array.from(statesSet),
                            note: 'States discovered from existing work items in the project'
                        }, null, 2),
                    }],
                };
            } else {
                // No work items found, return common states
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            type: args.work_item_type,
                            project: project,
                            common_states: ['New', 'Active', 'Resolved', 'Closed'],
                            message: 'No work items of this type found. These are common states used in most processes.'
                        }, null, 2),
                    }],
                };
            }
        }
    } catch (error: any) {
        // If all else fails, provide common states
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    type: args.work_item_type,
                    common_states: ['New', 'Active', 'Resolved', 'Closed'],
                    message: 'Could not discover specific states. These are common states used in most processes.',
                    error: error.message
                }, null, 2),
            }],
        };
    }
}

export async function handleDiscoverRelationships(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    // Look for work items that are likely to have relations (Epics, Features, or recently modified items)
    const query = `SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] IN ('Epic', 'Feature', 'User Story', 'Task') ORDER BY [System.ChangedDate] DESC`;
    const command = `az boards query ${orgFlag} --wiql "${query}" --output json`;

    try {
        const { stdout: queryOut } = await execAsync(command);
        const allItems = JSON.parse(queryOut);
        // Limit to first 10 items to avoid too many API calls
        const items = allItems.slice(0, 10);

        // Try to find a work item with relations
        let relations = null;
        let sampleId = null;
        
        for (const item of items) {
            try {
                const { stdout: itemOut } = await execAsync(`az boards work-item relation show ${orgFlag} --id ${item.id} --output json`);
                const itemRelations = JSON.parse(itemOut);
                
                if (itemRelations.relations && itemRelations.relations.length > 0) {
                    relations = itemRelations;
                    sampleId = item.id;
                    break;
                }
            } catch {
                // Skip items that fail
                continue;
            }
        }
        
        if (relations) {

            // Extract unique relation types
            const relationTypes = new Set(relations.relations?.map((r: any) => r.rel));

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
        } else {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ message: 'No work items with relations found' }, null, 2),
                }],
            };
        }
    } catch (error) {
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

export async function handleCheckFieldExists(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured(args.organization);

    try {
        // Use the field resolver which already has all fields cached
        const exists = await fieldResolver.fieldExists(args.field_name);

        if (exists) {
            // Try to get field details via REST API
            try {
                const result = await azureDevOpsInvoke({
                    area: 'wit',
                    resource: 'fields',
                    routeParameters: { field: args.field_name },
                    httpMethod: 'GET',
                    organization: args.organization
                });
                
                // Return only essential information, not the entire field object
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            exists: true,
                            field_name: args.field_name,
                            name: result.name,
                            type: result.type,
                            readOnly: result.readOnly || false,
                            isIdentity: result.isIdentity || false
                        }, null, 2),
                    }],
                };
            } catch {
                // Field exists but couldn't get details
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            exists: true,
                            field_name: args.field_name,
                            message: 'Field exists in the system'
                        }, null, 2),
                    }],
                };
            }
        } else {
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
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Failed to check field existence',
                    field_name: args.field_name,
                    message: error.message
                }, null, 2),
            }],
            isError: true
        };
    }
}

export async function handleGetDefaultProject(args: any): Promise<HandlerResult> {
    await ensureOrgConfigured(args.organization);
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
    } catch {
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

export async function handleHealthcheck(args: any): Promise<HandlerResult> {
    const orgFlag = await getOrgFlag(args.organization);
    const checks = {
        azure_cli: false,
        logged_in: false,
        devops_extension: false,
        default_org: false,
        default_project: false,
        can_query: false,
        rest_api_access: false
    };

    try {
        // Check Azure CLI
        await execAsync('az --version');
        checks.azure_cli = true;
    } catch {
        // Azure CLI not installed
    }

    try {
        // Check login
        await execAsync('az account show');
        checks.logged_in = true;
    } catch {
        // Not logged in
    }

    try {
        // Check DevOps extension
        await execAsync('az devops --help');
        checks.devops_extension = true;
    } catch {
        // Extension not installed
    }

    try {
        // Check defaults
        const { stdout: configOut } = await execAsync('az devops configure --list --output json');
        const config = JSON.parse(configOut);
        checks.default_org = !!config.defaults?.organization;
        checks.default_project = !!config.defaults?.project;
    } catch {
        // Can't get config
    }

    try {
        // Try a simple query
        await execAsync(`az boards query ${orgFlag} --wiql "SELECT [System.Id] FROM workitems WHERE [System.Id] = 1" --output json`);
        checks.can_query = true;
    } catch {
        // Can't query
    }

    try {
        // Check REST API access
        await azureDevOpsInvoke({
            area: 'wit',
            resource: 'fields',
            httpMethod: 'GET',
            queryParameters: { '$top': '1' },
            organization: args.organization
        });
        checks.rest_api_access = true;
    } catch {
        // Can't access REST API
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