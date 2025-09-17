import { azureDevOpsInvoke } from './azureDevOpsInvoke.js';

/**
 * Field resolver to handle process template differences
 * Discovers available fields and maps common aliases to actual field references
 */
class FieldResolver {
    private fieldCache: Map<string, string> = new Map();
    private allFields: any[] = [];
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    
    /**
     * Initialize the field resolver by discovering available fields
     */
    async initialize(): Promise<void> {
        // Prevent multiple simultaneous initializations
        if (this.initPromise) {
            return this.initPromise;
        }
        
        if (this.initialized) {
            return;
        }
        
        this.initPromise = this.doInitialize();
        await this.initPromise;
        this.initialized = true;
    }
    
    private async doInitialize(): Promise<void> {
        try {
            // Get all available fields from Azure DevOps
            const result = await azureDevOpsInvoke({
                area: 'wit',
                resource: 'fields',
                httpMethod: 'GET'
            });
            
            // Store all fields for reference
            this.allFields = result.value || result || [];
            
            // Build field mappings for common aliases
            this.buildFieldMappings();
            
        } catch (error) {
            console.error('Warning: Failed to initialize field resolver:', error);
            // Fall back to common field mappings
            this.useDefaultMappings();
        }
    }
    
    /**
     * Build field mappings based on discovered fields
     */
    private buildFieldMappings(): void {
        // Map common aliases to actual field references
        
        // ClosedDate - varies by process template
        const closedDateField = this.findFieldByVariations([
            'Microsoft.VSTS.Common.ClosedDate',
            'System.ClosedDate',
            'Microsoft.VSTS.CMMI.ClosedDate'
        ]);
        if (closedDateField) {
            this.fieldCache.set('ClosedDate', closedDateField);
        }
        
        // Priority
        const priorityField = this.findFieldByVariations([
            'Microsoft.VSTS.Common.Priority',
            'System.Priority'
        ]);
        if (priorityField) {
            this.fieldCache.set('Priority', priorityField);
        }
        
        // Severity (for bugs)
        const severityField = this.findFieldByVariations([
            'Microsoft.VSTS.Common.Severity',
            'System.Severity'
        ]);
        if (severityField) {
            this.fieldCache.set('Severity', severityField);
        }
        
        // Stack Rank
        const stackRankField = this.findFieldByVariations([
            'Microsoft.VSTS.Common.StackRank'
        ]);
        if (stackRankField) {
            this.fieldCache.set('StackRank', stackRankField);
        }
        
        // Value Area
        const valueAreaField = this.findFieldByVariations([
            'Microsoft.VSTS.Common.ValueArea'
        ]);
        if (valueAreaField) {
            this.fieldCache.set('ValueArea', valueAreaField);
        }
        
        // Story Points / Effort
        const effortField = this.findFieldByVariations([
            'Microsoft.VSTS.Scheduling.StoryPoints',
            'Microsoft.VSTS.Scheduling.Effort',
            'Microsoft.VSTS.Common.StoryPoints'
        ]);
        if (effortField) {
            this.fieldCache.set('StoryPoints', effortField);
            this.fieldCache.set('Effort', effortField);
        }
        
        // Original Estimate
        const originalEstimateField = this.findFieldByVariations([
            'Microsoft.VSTS.Scheduling.OriginalEstimate'
        ]);
        if (originalEstimateField) {
            this.fieldCache.set('OriginalEstimate', originalEstimateField);
        }
        
        // Remaining Work
        const remainingWorkField = this.findFieldByVariations([
            'Microsoft.VSTS.Scheduling.RemainingWork'
        ]);
        if (remainingWorkField) {
            this.fieldCache.set('RemainingWork', remainingWorkField);
        }
        
        // Completed Work
        const completedWorkField = this.findFieldByVariations([
            'Microsoft.VSTS.Scheduling.CompletedWork'
        ]);
        if (completedWorkField) {
            this.fieldCache.set('CompletedWork', completedWorkField);
        }
    }
    
    /**
     * Find a field by checking multiple variations
     */
    private findFieldByVariations(variations: string[]): string | null {
        for (const fieldRef of variations) {
            const field = this.allFields.find(f => 
                f.referenceName === fieldRef || 
                f.name === fieldRef
            );
            if (field) {
                return field.referenceName;
            }
        }
        return null;
    }
    
    /**
     * Use default mappings when field discovery fails
     */
    private useDefaultMappings(): void {
        // Use most common field references as defaults
        this.fieldCache.set('ClosedDate', 'Microsoft.VSTS.Common.ClosedDate');
        this.fieldCache.set('Priority', 'Microsoft.VSTS.Common.Priority');
        this.fieldCache.set('Severity', 'Microsoft.VSTS.Common.Severity');
        this.fieldCache.set('StackRank', 'Microsoft.VSTS.Common.StackRank');
        this.fieldCache.set('ValueArea', 'Microsoft.VSTS.Common.ValueArea');
        this.fieldCache.set('StoryPoints', 'Microsoft.VSTS.Scheduling.StoryPoints');
        this.fieldCache.set('Effort', 'Microsoft.VSTS.Scheduling.Effort');
        this.fieldCache.set('OriginalEstimate', 'Microsoft.VSTS.Scheduling.OriginalEstimate');
        this.fieldCache.set('RemainingWork', 'Microsoft.VSTS.Scheduling.RemainingWork');
        this.fieldCache.set('CompletedWork', 'Microsoft.VSTS.Scheduling.CompletedWork');
    }
    
    /**
     * Resolve a field alias to its actual reference name
     */
    async resolve(fieldAlias: string): Promise<string> {
        await this.initialize();
        
        // If it's already a full reference, return as-is
        if (fieldAlias.includes('.')) {
            return fieldAlias;
        }
        
        // Check cache for alias
        const resolved = this.fieldCache.get(fieldAlias);
        if (resolved) {
            return resolved;
        }
        
        // Default to System prefix for unknown fields
        return `System.${fieldAlias}`;
    }
    
    /**
     * Check if a field exists
     */
    async fieldExists(fieldRef: string): Promise<boolean> {
        await this.initialize();
        return this.allFields.some(f => 
            f.referenceName === fieldRef || 
            f.name === fieldRef
        );
    }
    
    /**
     * Get all available fields (for discovery tool)
     */
    async getAllFields(): Promise<any[]> {
        await this.initialize();
        return this.allFields;
    }
    
    /**
     * Reset the cache and re-initialize
     */
    async reset(): Promise<void> {
        this.fieldCache.clear();
        this.allFields = [];
        this.initialized = false;
        this.initPromise = null;
        await this.initialize();
    }
}

// Export a singleton instance
export const fieldResolver = new FieldResolver();
