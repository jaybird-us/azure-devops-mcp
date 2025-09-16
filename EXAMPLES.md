# Example Configuration for Azure DevOps MCP Server

This file shows example configurations for different scenarios.

## Claude Desktop Configuration

### Basic Configuration (npm package)

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["azure-devops-mcp"]
    }
  }
}
```

### Local Development Configuration

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": ["/Users/yourusername/projects/azure-devops-mcp/dist/index.js"]
    }
  }
}
```

### Configuration with Environment Variables

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["azure-devops-mcp"],
      "env": {
        "AZURE_DEVOPS_ORG": "https://dev.azure.com/mycompany",
        "AZURE_DEVOPS_PROJECT": "MyDefaultProject"
      }
    }
  }
}
```

## Azure CLI Configuration

### Basic Setup

```bash
# Login to Azure
az login

# Add Azure DevOps extension
az extension add --name azure-devops

# Set default organization
az devops configure --defaults organization=https://dev.azure.com/myorg

# Set default project (optional)
az devops configure --defaults project=MyProject
```

### Using Personal Access Token (PAT)

```bash
# Set PAT as environment variable
export AZURE_DEVOPS_EXT_PAT=your_personal_access_token

# Or login with PAT
az devops login --organization https://dev.azure.com/myorg
```

### Multiple Organizations

If you work with multiple organizations, you can switch between them:

```bash
# List current defaults
az devops configure --list

# Switch organization
az devops configure --defaults organization=https://dev.azure.com/other-org

# Clear defaults
az devops configure --defaults organization= project=
```

## Usage Examples

### Query Examples

```javascript
// Get all my active items
{
  "tool": "query_work_items",
  "arguments": {
    "query": "my-items"
  }
}

// Custom WIQL query
{
  "tool": "query_work_items",
  "arguments": {
    "query": "SELECT [System.Id], [System.Title] FROM workitems WHERE [System.AssignedTo] = @Me AND [System.State] = 'Active' ORDER BY [System.Priority]"
  }
}

// Project-specific query
{
  "tool": "query_work_items",
  "arguments": {
    "query": "my-bugs",
    "project": "WebApplication"
  }
}
```

### Create Work Item Examples

```javascript
// Simple task
{
  "tool": "create_work_item",
  "arguments": {
    "type": "Task",
    "title": "Review pull request #123"
  }
}

// Detailed bug report
{
  "tool": "create_work_item",
  "arguments": {
    "type": "Bug",
    "title": "Login page throws 404 error",
    "description": "Users cannot access login page. Error: 404 Not Found\n\nSteps to reproduce:\n1. Navigate to /login\n2. Page shows 404 error\n\nExpected: Login form should appear",
    "assigned_to": "@Me",
    "tags": "critical;authentication;production",
    "project": "WebApp"
  }
}
```

### Update Work Item Examples

```javascript
// Change state
{
  "tool": "update_work_item",
  "arguments": {
    "id": 123,
    "state": "Active"
  }
}

// Complete update with comment
{
  "tool": "update_work_item",
  "arguments": {
    "id": 456,
    "state": "Resolved",
    "comment": "Fixed in commit abc123. Deployed to staging for verification."
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Organization not set**
   ```bash
   az devops configure --defaults organization=https://dev.azure.com/yourorg
   ```

2. **Authentication failed**
   ```bash
   az logout
   az login
   ```

3. **Project not found**
   ```bash
   # List available projects
   az devops project list --organization https://dev.azure.com/yourorg
   ```

4. **Permission denied**
   - Ensure your account has appropriate permissions in Azure DevOps
   - Check if you need to use a Personal Access Token (PAT)

5. **Tool not responding**
   - Check if the MCP server is running: `ps aux | grep azure-devops-mcp`
   - Restart Claude Desktop
   - Check logs in Claude Desktop developer console
