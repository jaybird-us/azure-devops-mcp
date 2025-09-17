/**
 * Type definitions for work item relationship management
 */

export interface AddWorkItemRelationArgs {
    id: number;
    relation_type: string;
    target_id?: number | number[];
    target_url?: string;
}

export interface RemoveWorkItemRelationArgs {
    id: number;
    relation_type: string;
    target_id: number | number[];
}

export interface GetWorkItemRelationsArgs {
    id: number;
}

export interface ListRelationTypesArgs {
    // No parameters needed
}

export interface WorkItemRelation {
    rel: string;
    url: string;
    attributes?: {
        isLocked?: boolean;
        authorizedDate?: string;
        id?: number;
        resourceCreatedDate?: string;
        resourceModifiedDate?: string;
        revisedDate?: string;
    };
}

export interface RelationType {
    referenceName: string;
    name: string;
    attributes: {
        usage: string;
        editable: boolean;
        enabled: boolean;
        acyclic: boolean;
        directional: boolean;
        singleTarget: boolean;
        topology: string;
    };
}
