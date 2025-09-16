import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function ensureOrgConfigured(): Promise<string> {
    const { stdout: configOut } = await execAsync('az devops configure --list --output json');
    const config = JSON.parse(configOut);
    
    let org = config.defaults?.organization;
    
    if (!org) {
        org = 'https://dev.azure.com/';
        await execAsync(`az devops configure --defaults organization=${org}`);
    }
    
    return org;
}
