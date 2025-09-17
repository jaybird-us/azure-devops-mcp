import { ToolDefinition } from '../types.js';
import { workItemTools } from './workitems.js';
import { discoveryTools } from './discovery.js';
import { projectTools } from './projects.js';
import { iterationTools } from './iterations.js';

// Combine all tools (26 total) - Query tools removed
export const allTools: ToolDefinition[] = [
    ...workItemTools,    // 6 tools
    ...discoveryTools,   // 9 tools
    ...projectTools,     // 6 tools
    ...iterationTools,   // 5 tools
];
