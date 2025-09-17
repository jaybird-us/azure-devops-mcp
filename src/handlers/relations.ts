import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureOrgConfigured } from '../helpers/ensureOrg.js';
import { HandlerResult } from '../types.js';
import type { 
    AddWorkItemRelationArgs, 
    RemoveWorkItemRelationArgs, 
    GetWorkItemRelationsArgs,
    ListRelationTypesArgs
} from '../types/relations.js';

const execAsync = promisify(exec);

/**
 * Map user-friendly relation types to Azure DevOps relation types
 */
const RELATION_TYPE_MAP: Record<string, string> = {
    // Hierarchy
    'parent': 'System.LinkTypes.Hierarchy-Reverse',
    'child': 'System.LinkTypes.Hierarchy-Forward',
    
    // Related
    'related': 'System.LinkTypes.Related',
    
    // Dependency
    'predecessor': 'System.LinkTypes.Dependency-Reverse',
    'successor': 'System.LinkTypes.Dependency-Forward',
    
    // Duplicate
    'duplicate': 'System.LinkTypes.Duplicate-Forward',
    'duplicate of': 'System.LinkTypes.Duplicate-Reverse',
    
    // Testing
    'tested by': 'Microsoft.VSTS.Common.TestedBy-Forward',
    'tests': 'Microsoft.VSTS.Common.TestedBy-Reverse',
    
    // Keep original if not mapped
};

/**
 * Normalize relation type to Azure DevOps format
 * Azure CLI expects the friendly names, not the full reference names
 */
function normalizeRelationType(type: string): string {
    // Azure CLI accepts friendly names directly
    // Just ensure consistent casing
    return type;
}

/**
 * Format target IDs for CLI command
 */
function formatTargetIds(targetId: number | number[] | undefined): string[] {
    if (!targetId) return [];
    return Array.isArray(targetId) ? targetId.map(id => id.toString()) : [targetId.toString()];
}

export async function handleAddWorkItemRelation(args: AddWorkItemRelationArgs): Promise<HandlerResult> {
    await ensureOrgConfigured();
    
    const relationType = normalizeRelationType(args.relation_type);
    let command = `az boards work-item relation add --id ${args.id} --relation-type "${relationType}"`;
    
    // Handle target specification
    if (args.target_id) {
        const targetIds = formatTargetIds(args.target_id);
        if (targetIds.length > 0) {
            command += ` --target-id ${targetIds.join(' ')}`;
        }
    } else if (args.target_url) {
        command += ` --target-url "${args.target_url}"`;
    } else {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Either target_id or target_url must be provided'
                }, null, 2),
            }],
            isError: true,
        };
    }
    
    command += ' --output json';
    
    try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        // Extract relation information
        const relations = result.relations || [];
        const newRelations = relations.filter((rel: any) => 
            rel.rel === relationType
        );
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Added ${args.relation_type} relationship to work item #${args.id}`,
                    workItemId: args.id,
                    relationType: args.relation_type,
                    targetIds: args.target_id,
                    newRelations: newRelations.map((rel: any) => ({
                        type: rel.rel,
                        url: rel.url,
                        targetId: rel.url ? parseInt(rel.url.split('/').pop() || '0') : null
                    })),
                    totalRelations: relations.length
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to add relation: ${error.message}`,
                    hint: 'Ensure both work items exist and you have permission to modify them'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleRemoveWorkItemRelation(args: RemoveWorkItemRelationArgs): Promise<HandlerResult> {
    await ensureOrgConfigured();
    
    const relationType = normalizeRelationType(args.relation_type);
    const targetIds = formatTargetIds(args.target_id);
    
    if (targetIds.length === 0) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'No target IDs provided'
                }, null, 2),
            }],
            isError: true,
        };
    }
    
    let command = `az boards work-item relation remove --id ${args.id} --relation-type "${relationType}" --target-id ${targetIds.join(' ')} --yes --output json`;
    
    try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    message: `Removed ${args.relation_type} relationship from work item #${args.id}`,
                    workItemId: args.id,
                    relationType: args.relation_type,
                    removedTargetIds: args.target_id,
                    remainingRelations: result.relations?.length || 0
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to remove relation: ${error.message}`,
                    hint: 'Ensure the relation exists and you have permission to modify it'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleGetWorkItemRelations(args: GetWorkItemRelationsArgs): Promise<HandlerResult> {
    await ensureOrgConfigured();
    
    const command = `az boards work-item relation show --id ${args.id} --output json`;
    
    try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        // Group relations by type for better readability
        const groupedRelations: Record<string, any[]> = {};
        const relations = result.relations || [];
        
        relations.forEach((rel: any) => {
            const type = rel.rel || 'Unknown';
            if (!groupedRelations[type]) {
                groupedRelations[type] = [];
            }
            
            // Extract target ID from URL
            const targetId = rel.url ? rel.url.split('/').pop() : null;
            
            groupedRelations[type].push({
                targetId: targetId ? parseInt(targetId) : null,
                url: rel.url,
                attributes: rel.attributes
            });
        });
        
        // Create friendly names mapping
        const friendlyNames: Record<string, string> = {
            'System.LinkTypes.Hierarchy-Forward': 'Children',
            'System.LinkTypes.Hierarchy-Reverse': 'Parent',
            'System.LinkTypes.Related': 'Related',
            'System.LinkTypes.Dependency-Forward': 'Successors',
            'System.LinkTypes.Dependency-Reverse': 'Predecessors',
            'System.LinkTypes.Duplicate-Forward': 'Duplicates',
            'System.LinkTypes.Duplicate-Reverse': 'Duplicate Of',
            'Microsoft.VSTS.Common.TestedBy-Forward': 'Tested By',
            'Microsoft.VSTS.Common.TestedBy-Reverse': 'Tests',
        };
        
        // Transform to friendly format
        const friendlyRelations: Record<string, any[]> = {};
        Object.entries(groupedRelations).forEach(([type, items]) => {
            const friendlyName = friendlyNames[type] || type;
            friendlyRelations[friendlyName] = items;
        });
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    workItemId: args.id,
                    totalRelations: relations.length,
                    relationsByType: friendlyRelations,
                    summary: {
                        parents: groupedRelations['System.LinkTypes.Hierarchy-Reverse']?.length || 0,
                        children: groupedRelations['System.LinkTypes.Hierarchy-Forward']?.length || 0,
                        related: groupedRelations['System.LinkTypes.Related']?.length || 0,
                        predecessors: groupedRelations['System.LinkTypes.Dependency-Reverse']?.length || 0,
                        successors: groupedRelations['System.LinkTypes.Dependency-Forward']?.length || 0,
                        duplicates: groupedRelations['System.LinkTypes.Duplicate-Forward']?.length || 0,
                    }
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to get relations: ${error.message}`,
                    hint: 'Ensure the work item exists and you have permission to view it'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function handleListRelationTypes(args: ListRelationTypesArgs): Promise<HandlerResult> {
    await ensureOrgConfigured();
    
    const command = `az boards work-item relation list-type --output json`;
    
    try {
        const { stdout } = await execAsync(command);
        const relationTypes = JSON.parse(stdout);
        
        // Group by category for better organization
        const categorized = {
            hierarchy: [] as any[],
            dependency: [] as any[],
            related: [] as any[],
            testing: [] as any[],
            other: [] as any[]
        };
        
        relationTypes.forEach((type: any) => {
            const simplified = {
                name: type.name,
                referenceName: type.referenceName,
                usage: type.attributes?.usage,
                directional: type.attributes?.directional,
                editable: type.attributes?.editable
            };
            
            if (type.referenceName?.includes('Hierarchy')) {
                categorized.hierarchy.push(simplified);
            } else if (type.referenceName?.includes('Dependency')) {
                categorized.dependency.push(simplified);
            } else if (type.referenceName?.includes('Related')) {
                categorized.related.push(simplified);
            } else if (type.referenceName?.includes('Test')) {
                categorized.testing.push(simplified);
            } else {
                categorized.other.push(simplified);
            }
        });
        
        // Common usage examples
        const usageExamples = {
            "Parent/Child": "Use 'Parent' or 'Child' in add_work_item_relation",
            "Related": "Use 'Related' for bidirectional relationships",
            "Dependencies": "Use 'Predecessor' or 'Successor' for task dependencies",
            "Duplicates": "Use 'Duplicate' or 'Duplicate Of' to mark duplicates",
            "Testing": "Use 'Tested By' or 'Tests' for test relationships"
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    totalTypes: relationTypes.length,
                    categorizedTypes: categorized,
                    usageExamples: usageExamples,
                    hint: "You can use friendly names like 'Parent', 'Child', 'Related' etc. when adding relations"
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Failed to list relation types: ${error.message}`,
                    defaultTypes: {
                        hierarchy: ['Parent', 'Child'],
                        related: ['Related'],
                        dependency: ['Predecessor', 'Successor'],
                        duplicate: ['Duplicate', 'Duplicate Of'],
                        testing: ['Tested By', 'Tests']
                    }
                }, null, 2),
            }],
        };
    }
}
