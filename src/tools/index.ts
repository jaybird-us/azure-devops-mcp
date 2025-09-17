import { ToolDefinition } from '../types.js';
import { workItemTools } from './workitems.js';
import { discoveryTools } from './discovery.js';
import { projectTools } from './projects.js';
import { iterationTools } from './iterations.js';
import { relationTools } from './relations.js';

// Combine all tools (30 total)
export const allTools: ToolDefinition[] = [
    ...workItemTools,    // 6 tools
    ...discoveryTools,   // 9 tools
    ...projectTools,     // 6 tools
    ...iterationTools,   // 5 tools
    ...relationTools,    // 4 tools - NEW!
];
