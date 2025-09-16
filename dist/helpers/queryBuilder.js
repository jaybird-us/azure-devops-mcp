export const queryTemplates = {
    'my-items': `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] 
               FROM workitems 
               WHERE [System.AssignedTo] = @Me 
               AND [System.State] <> 'Closed' 
               AND [System.State] <> 'Removed'
               ORDER BY [System.CreatedDate] DESC`,
    'my-bugs': `SELECT [System.Id], [System.Title], [System.State] 
              FROM workitems 
              WHERE [System.AssignedTo] = @Me 
              AND [System.WorkItemType] = 'Bug' 
              AND [System.State] <> 'Closed'`,
    'my-tasks': `SELECT [System.Id], [System.Title], [System.State] 
               FROM workitems 
               WHERE [System.AssignedTo] = @Me 
               AND [System.WorkItemType] = 'Task' 
               AND [System.State] <> 'Closed'`,
    'recent': `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] 
             FROM workitems 
             WHERE [System.ChangedDate] >= @Today - 7 
             ORDER BY [System.ChangedDate] DESC`,
};
export function buildQuery(queryType) {
    return queryTemplates[queryType] || queryType;
}
