export interface Iteration {
    id: string;
    name: string;
    path: string;
    startDate?: string;
    finishDate?: string;
    state: 'past' | 'current' | 'future';
    attributes?: {
        startDate?: string;
        finishDate?: string;
        timeFrame?: string;
    };
}

export interface ListIterationsArgs {
    project: string;
    team?: string;
    depth?: number;
}

export interface GetIterationWorkItemsArgs {
    project: string;
    iteration: string;
}

export interface MoveToIterationArgs {
    id: number;
    iteration: string;
    project?: string;
}

export interface GetCurrentIterationArgs {
    project: string;
    team?: string;
}

export interface GetIterationDetailsArgs {
    project: string;
    iteration: string;
}
