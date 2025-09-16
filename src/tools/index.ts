import { ToolDefinition } from '../types.js';
import { workItemTools } from './workitems.js';
import { discoveryTools } from './discovery.js';
import { projectTools } from './projects.js';
import { queryTools } from './queries.js';

// Combine all tools
export const allTools: ToolDefinition[] = [
    ...workItemTools,
    ...discoveryTools,
    ...projectTools,
    ...queryTools,
];