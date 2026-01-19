import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { HandlerResult } from '../types.js';
import { getActiveOrg, setActiveOrg, clearActiveOrg } from '../helpers/ensureOrg.js';

const execAsync = promisify(exec);

export async function handleListOrganizations(args: any): Promise<HandlerResult> {
    const organizations: Array<{ name: string; url: string; source: string; active: boolean }> = [];
    const currentOrg = getActiveOrg();

    try {
        // 1. Check environment variable
        if (process.env.AZURE_DEVOPS_ORG) {
            const envOrg = process.env.AZURE_DEVOPS_ORG;
            const orgName = extractOrgName(envOrg);
            organizations.push({
                name: orgName,
                url: normalizeOrgUrl(envOrg),
                source: 'environment (AZURE_DEVOPS_ORG)',
                active: currentOrg === normalizeOrgUrl(envOrg)
            });
        }

        // 2. Check Azure CLI defaults
        try {
            const { stdout } = await execAsync('az devops configure --list');
            const orgMatch = stdout.match(/organization\s*=\s*([^\s\n]+)/);
            if (orgMatch && orgMatch[1]) {
                const cliOrg = orgMatch[1];
                const orgName = extractOrgName(cliOrg);
                // Only add if not already in list
                if (!organizations.find(o => o.url === normalizeOrgUrl(cliOrg))) {
                    organizations.push({
                        name: orgName,
                        url: normalizeOrgUrl(cliOrg),
                        source: 'azure-cli-defaults',
                        active: currentOrg === normalizeOrgUrl(cliOrg)
                    });
                }
            }
        } catch {
            // Azure CLI not configured
        }

        // 3. Get organizations from Azure account (if logged in)
        try {
            // First check if user is logged in
            await execAsync('az account show');

            // Try to get the user's profile which contains org memberships
            // This uses the Azure DevOps REST API via az rest
            const { stdout: profileOut } = await execAsync(
                'az rest --method GET --uri "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0" 2>/dev/null || echo "{}"'
            );

            // Try to list organizations the user has access to
            try {
                const { stdout: orgsOut } = await execAsync(
                    'az rest --method GET --uri "https://app.vssps.visualstudio.com/_apis/accounts?api-version=6.0" 2>/dev/null || echo "{}"'
                );

                const orgsData = JSON.parse(orgsOut);
                if (orgsData.value && Array.isArray(orgsData.value)) {
                    for (const org of orgsData.value) {
                        const orgUrl = `https://dev.azure.com/${org.accountName}`;
                        if (!organizations.find(o => o.url === orgUrl)) {
                            organizations.push({
                                name: org.accountName,
                                url: orgUrl,
                                source: 'azure-account',
                                active: currentOrg === orgUrl
                            });
                        }
                    }
                }
            } catch {
                // Can't list orgs from account
            }
        } catch {
            // Not logged in or can't get profile
        }

        // If no orgs found, provide helpful message
        if (organizations.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        organizations: [],
                        message: 'No organizations found. Please configure one using set_organization or set the AZURE_DEVOPS_ORG environment variable.',
                        hint: 'You can also run: az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG'
                    }, null, 2),
                }],
            };
        }

        // Mark which one is currently active
        const activeOrg = currentOrg || organizations[0]?.url;
        organizations.forEach(org => {
            org.active = org.url === activeOrg;
        });

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    organizations,
                    current: activeOrg,
                    count: organizations.length,
                    hint: 'Use set_organization to switch between orgs'
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Failed to list organizations',
                    message: error.message,
                    hint: 'Make sure you are logged in with "az login"'
                }, null, 2),
            }],
            isError: true
        };
    }
}

export async function handleGetOrganization(args: any): Promise<HandlerResult> {
    try {
        const currentOrg = getActiveOrg();

        if (currentOrg) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        organization: currentOrg,
                        name: extractOrgName(currentOrg),
                        source: 'runtime-session',
                        hint: 'Use set_organization to change, or list_organizations to see all available'
                    }, null, 2),
                }],
            };
        }

        // Check environment variable
        if (process.env.AZURE_DEVOPS_ORG) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        organization: process.env.AZURE_DEVOPS_ORG,
                        name: extractOrgName(process.env.AZURE_DEVOPS_ORG),
                        source: 'environment (AZURE_DEVOPS_ORG)',
                        hint: 'Use set_organization to switch to a different org'
                    }, null, 2),
                }],
            };
        }

        // Check Azure CLI defaults
        try {
            const { stdout } = await execAsync('az devops configure --list');
            const orgMatch = stdout.match(/organization\s*=\s*([^\s\n]+)/);
            if (orgMatch && orgMatch[1]) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            organization: orgMatch[1],
                            name: extractOrgName(orgMatch[1]),
                            source: 'azure-cli-defaults',
                            hint: 'Use set_organization to switch to a different org'
                        }, null, 2),
                    }],
                };
            }
        } catch {
            // Azure CLI not configured
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    organization: null,
                    message: 'No organization configured',
                    hint: 'Use set_organization to set an organization, or run list_organizations to discover available ones'
                }, null, 2),
            }],
        };
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Failed to get organization',
                    message: error.message
                }, null, 2),
            }],
            isError: true
        };
    }
}

export async function handleSetOrganization(args: any): Promise<HandlerResult> {
    try {
        const orgInput = args.organization;
        const orgUrl = normalizeOrgUrl(orgInput);
        const orgName = extractOrgName(orgUrl);

        // Validate the organization by trying to list projects
        try {
            const { stdout } = await execAsync(
                `az devops project list --organization "${orgUrl}" --output json`
            );
            const projects = JSON.parse(stdout);
            const projectCount = projects.value?.length || 0;

            // Set the active org in runtime
            setActiveOrg(orgUrl);

            // Also update Azure CLI defaults for persistence
            await execAsync(`az devops configure --defaults organization="${orgUrl}"`);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        organization: orgUrl,
                        name: orgName,
                        projectCount,
                        message: `Switched to organization: ${orgName}`,
                        hint: projectCount > 0
                            ? `Found ${projectCount} project(s). Use list_projects to see them.`
                            : 'No projects found in this organization.'
                    }, null, 2),
                }],
            };
        } catch (error: any) {
            // Check if it's an access error vs org not found
            if (error.message?.includes('401') || error.message?.includes('403')) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            organization: orgUrl,
                            error: 'Access denied',
                            message: `You don't have access to organization: ${orgName}`,
                            hint: 'Check if you have permissions or if the organization name is correct'
                        }, null, 2),
                    }],
                    isError: true
                };
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        organization: orgUrl,
                        error: 'Organization not found or inaccessible',
                        message: error.message,
                        hint: 'Use list_organizations to see available orgs'
                    }, null, 2),
                }],
                isError: true
            };
        }
    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Failed to set organization',
                    message: error.message
                }, null, 2),
            }],
            isError: true
        };
    }
}

// Helper functions
function normalizeOrgUrl(input: string): string {
    // If it's already a full URL, return as-is
    if (input.startsWith('https://')) {
        return input.replace(/\/$/, ''); // Remove trailing slash
    }
    // Otherwise, assume it's just the org name
    return `https://dev.azure.com/${input}`;
}

function extractOrgName(url: string): string {
    // Extract org name from URL like https://dev.azure.com/myorg
    const match = url.match(/dev\.azure\.com\/([^\/]+)/);
    if (match) {
        return match[1];
    }
    // Also handle legacy URLs like https://myorg.visualstudio.com
    const legacyMatch = url.match(/https?:\/\/([^\.]+)\.visualstudio\.com/);
    if (legacyMatch) {
        return legacyMatch[1];
    }
    // If not a URL, assume it's just the name
    return url.replace('https://dev.azure.com/', '').replace(/\/$/, '');
}
