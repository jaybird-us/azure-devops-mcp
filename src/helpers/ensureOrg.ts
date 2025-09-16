import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function ensureOrgConfigured(): Promise<string> {
    // 1. Check environment variable FIRST (from Claude Desktop config)
    if (process.env.AZURE_DEVOPS_ORG) {
        return process.env.AZURE_DEVOPS_ORG;
    }

    // 2. Check Azure CLI configuration
    try {
        const { stdout } = await execAsync('az devops configure --list');
        const orgMatch = stdout.match(/organization\s*=\s*([^\s\n]+)/);
        if (orgMatch && orgMatch[1]) {
            return orgMatch[1];
        }
    } catch {
        // Azure CLI not configured or not installed
    }

    // 3. Fail with helpful instructions
    throw new Error(
        'Azure DevOps organization not configured.\n\n' +
        'Option 1: Add to your Claude Desktop configuration:\n' +
        '  "env": {\n' +
        '    "AZURE_DEVOPS_ORG": "https://dev.azure.com/YOUR_ORG"\n' +
        '  }\n\n' +
        'Option 2: Configure Azure CLI:\n' +
        '  az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG'
    );
}