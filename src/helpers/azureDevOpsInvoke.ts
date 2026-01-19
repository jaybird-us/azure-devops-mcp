import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureOrgConfigured } from './ensureOrg.js';

const execAsync = promisify(exec);

export interface InvokeOptions {
    area: string;
    resource: string;
    routeParameters?: Record<string, string>;
    queryParameters?: Record<string, string>;
    httpMethod?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    body?: any;
    apiVersion?: string;
    rawOutput?: boolean;
    organization?: string; // Optional org override
}

/**
 * Wrapper for az devops invoke command to call Azure DevOps REST APIs
 * @param options Configuration for the REST API call
 * @returns Parsed JSON response from the API
 */
export async function azureDevOpsInvoke(options: InvokeOptions): Promise<any> {
    const org = await ensureOrgConfigured(options.organization);

    let command = `az devops invoke`;
    command += ` --organization "${org}"`;
    command += ` --area ${options.area}`;
    command += ` --resource ${options.resource}`;
    command += ` --http-method ${options.httpMethod || 'GET'}`;
    command += ` --api-version ${options.apiVersion || '7.1'}`;
    command += ` --output json`;

    // Handle route parameters (e.g., project=MyProject teamId=123)
    if (options.routeParameters) {
        const params = Object.entries(options.routeParameters)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join(' ');
        if (params) {
            command += ` --route-parameters ${params}`;
        }
    }

    // Handle query parameters (URL query string parameters)
    if (options.queryParameters) {
        const queryString = Object.entries(options.queryParameters)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        if (queryString) {
            // Azure CLI expects query parameters in a specific format
            command += ` --query-parameters "${queryString}"`;
        }
    }

    // Handle request body for POST/PATCH/PUT requests
    let tempFile: string | undefined;
    if (options.body && ['POST', 'PATCH', 'PUT'].includes(options.httpMethod || '')) {
        // Azure CLI requires body to be passed via a file
        tempFile = join(tmpdir(), `azure-devops-body-${Date.now()}.json`);
        writeFileSync(tempFile, JSON.stringify(options.body));
        command += ` --in-file "${tempFile}"`;
    }

    try {
        // Execute the command
        const { stdout, stderr } = await execAsync(command);

        // Clean up temp file if created
        if (tempFile) {
            try {
                unlinkSync(tempFile);
            } catch {
                // Ignore cleanup errors
            }
        }

        // Handle raw output option
        if (options.rawOutput) {
            return stdout;
        }

        // Parse and return JSON response
        try {
            return JSON.parse(stdout);
        } catch (parseError) {
            // If parsing fails, return the raw output
            console.error('Failed to parse Azure DevOps API response:', parseError);
            return stdout;
        }
    } catch (error: any) {
        // Clean up temp file on error
        if (tempFile) {
            try {
                unlinkSync(tempFile);
            } catch {
                // Ignore cleanup errors
            }
        }

        // Enhanced error handling
        if (error.stderr) {
            // Check for common errors
            if (error.stderr.includes('TF400813')) {
                throw new Error('Resource not found. The specified resource does not exist.');
            }
            if (error.stderr.includes('TF401019')) {
                throw new Error('Authentication failed. Please run "az login" and try again.');
            }
            if (error.stderr.includes('TF400898')) {
                throw new Error('Invalid field or resource. The requested field may not exist in this process template.');
            }
        }

        // Re-throw with more context
        throw new Error(`Azure DevOps API call failed: ${error.message || error}`);
    }
}

/**
 * Helper to get the organization URL from configuration
 * @param overrideOrg Optional organization override
 */
export async function getOrganization(overrideOrg?: string): Promise<string> {
    return await ensureOrgConfigured(overrideOrg);
}

/**
 * Helper to build field reference names that are process template agnostic
 */
export function buildFieldRef(fieldName: string): string {
    // Common field mappings
    const commonMappings: Record<string, string[]> = {
        'Priority': [
            'Microsoft.VSTS.Common.Priority',
            'System.Priority'
        ],
        'ClosedDate': [
            'Microsoft.VSTS.Common.ClosedDate',
            'System.ClosedDate',
            'Microsoft.VSTS.CMMI.ClosedDate'
        ],
        'Severity': [
            'Microsoft.VSTS.Common.Severity',
            'System.Severity'
        ],
        'StackRank': [
            'Microsoft.VSTS.Common.StackRank'
        ],
        'ValueArea': [
            'Microsoft.VSTS.Common.ValueArea'
        ]
    };

    // If it's already a full reference, return as-is
    if (fieldName.includes('.')) {
        return fieldName;
    }

    // Check if we have a mapping
    const mappings = commonMappings[fieldName];
    if (mappings && mappings.length > 0) {
        return mappings[0]; // Return the most common one
    }

    // Default to System prefix for unknown fields
    return `System.${fieldName}`;
}
