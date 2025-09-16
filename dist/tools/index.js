import { workItemTools } from './workitems.js';
import { discoveryTools } from './discovery.js';
import { projectTools } from './projects.js';
import { queryTools } from './queries.js';
export const allTools = [
    ...workItemTools,
    ...discoveryTools,
    ...projectTools,
    ...queryTools,
];
