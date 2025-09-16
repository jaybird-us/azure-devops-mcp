export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface QueryTemplate {
    [key: string]: string;
}

export interface HandlerResult {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}