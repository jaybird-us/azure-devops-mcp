import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Runtime organization state - allows switching orgs without restarting
let activeOrganization: string | null = null;

/**
 * Get the currently active organization (runtime state)
 */
export function getActiveOrg(): string | null {
    return activeOrganization;
}

/**
 * Set the active organization at runtime
 */
export function setActiveOrg(org: string): void {
    activeOrganization = org;
}

/**
 * Clear the runtime organization (fall back to env/CLI defaults)
 */
export function clearActiveOrg(): void {
    activeOrganization = null;
}

/**
 * Get the organization to use for commands.
 * Priority: 1) Runtime active org, 2) Env var, 3) Azure CLI defaults
 *
 * @param overrideOrg - Optional org override for this specific call
 */
export async function ensureOrgConfigured(overrideOrg?: string): Promise<string> {
    // 0. Check for per-call override first
    if (overrideOrg) {
        return normalizeOrgUrl(overrideOrg);
    }

    // 1. Check runtime active organization (set via set_organization tool)
    if (activeOrganization) {
        return activeOrganization;
    }

    // 2. Check environment variable (from Claude Desktop config)
    if (process.env.AZURE_DEVOPS_ORG) {
        return process.env.AZURE_DEVOPS_ORG;
    }

    // 3. Check Azure CLI configuration
    try {
        const { stdout } = await execAsync('az devops configure --list');
        const orgMatch = stdout.match(/organization\s*=\s*([^\s\n]+)/);
        if (orgMatch && orgMatch[1]) {
            return orgMatch[1];
        }
    } catch {
        // Azure CLI not configured or not installed
    }

    // 4. Fail with helpful instructions
    throw new Error(
        'Azure DevOps organization not configured.\n\n' +
        'Use the set_organization tool to set an organization, or:\n\n' +
        'Option 1: Add to your Claude Desktop configuration:\n' +
        '  "env": {\n' +
        '    "AZURE_DEVOPS_ORG": "https://dev.azure.com/YOUR_ORG"\n' +
        '  }\n\n' +
        'Option 2: Configure Azure CLI:\n' +
        '  az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG\n\n' +
        'Use list_organizations to see available organizations.'
    );
}

/**
 * Normalize an organization input to a full URL
 */
function normalizeOrgUrl(input: string): string {
    if (input.startsWith('https://')) {
        return input.replace(/\/$/, '');
    }
    return `https://dev.azure.com/${input}`;
}
