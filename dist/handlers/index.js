import * as workItemHandlers from './workitems.js';
import * as discoveryHandlers from './discovery.js';
import * as projectHandlers from './projects.js';
import * as queryHandlers from './queries.js';
export async function handleToolCall(name, args) {
    try {
        switch (name) {
            case 'query_work_items':
                return await workItemHandlers.handleQueryWorkItems(args);
            case 'get_work_item':
                return await workItemHandlers.handleGetWorkItem(args);
            case 'create_work_item':
                return await workItemHandlers.handleCreateWorkItem(args);
            case 'update_work_item':
                return await workItemHandlers.handleUpdateWorkItem(args);
            case 'add_comment':
                return await workItemHandlers.handleAddComment(args);
            case 'list_my_work':
                return await workItemHandlers.handleListMyWork(args);
            case 'discover_fields':
                return await discoveryHandlers.handleDiscoverFields(args);
            case 'inspect_work_item':
                return await discoveryHandlers.handleInspectWorkItem(args);
            case 'test_query':
                return await discoveryHandlers.handleTestQuery(args);
            case 'discover_work_item_types':
                return await discoveryHandlers.handleDiscoverWorkItemTypes(args);
            case 'discover_states':
                return await discoveryHandlers.handleDiscoverStates(args);
            case 'discover_relationships':
                return await discoveryHandlers.handleDiscoverRelationships(args);
            case 'check_field_exists':
                return await discoveryHandlers.handleCheckFieldExists(args);
            case 'get_default_project':
                return await discoveryHandlers.handleGetDefaultProject(args);
            case 'healthcheck':
                return await discoveryHandlers.handleHealthcheck(args);
            case 'list_projects':
                return await projectHandlers.handleListProjects(args);
            case 'get_project':
                return await projectHandlers.handleGetProject(args);
            case 'list_project_teams':
                return await projectHandlers.handleListProjectTeams(args);
            case 'list_project_repos':
                return await projectHandlers.handleListProjectRepos(args);
            case 'list_project_pipelines':
                return await projectHandlers.handleListProjectPipelines(args);
            case 'get_project_stats':
                return await projectHandlers.handleGetProjectStats(args);
            case 'list_saved_queries':
                return await queryHandlers.handleListSavedQueries(args);
            case 'run_saved_query':
                return await queryHandlers.handleRunSavedQuery(args);
            case 'create_saved_query':
                return await queryHandlers.handleCreateSavedQuery(args);
            case 'update_saved_query':
                return await queryHandlers.handleUpdateSavedQuery(args);
            case 'delete_saved_query':
                return await queryHandlers.handleDeleteSavedQuery(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `Error: ${error.message}\n\nMake sure you're logged in with 'az login' and have configured your organization with 'az devops configure --defaults organization=YOUR_ORG'`,
                }],
            isError: true,
        };
    }
}
