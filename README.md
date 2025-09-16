# Azure DevOps MCP Server

[![MCP](https://img.shields.io/badge/MCP-1.0-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

A Model Context Protocol (MCP) server that enables Claude to interact with Azure DevOps work items, projects, and boards directly through natural language.

## 🎯 Features

- **Project Management**
  - List all projects in your Azure DevOps organization
  - Get detailed project information and statistics

- **Sprint & Iteration Management** 🆕
  - List all iterations/sprints in a project
  - Get the current active sprint
  - View work items in specific iterations
  - Move work items between sprints
  - Get detailed iteration statistics
  - Check team capacity for iterations

- **Work Item Operations**
  - Query work items using WIQL or predefined shortcuts
  - Create new work items (Tasks, Bugs, User Stories, Features, Epics, Issues)
  - Update existing work items (title, state, assignee, description)
  - Add comments and discussions to work items
  - Get detailed work item information

- **Personal Productivity**
  - List all work items assigned to you
  - View items organized by state
  - Include recently completed items
  - Use smart query shortcuts (`my-items`, `my-bugs`, `my-tasks`, `recent`)

## 📋 Prerequisites

Before installing this MCP server, ensure you have:

1. **Node.js** (v18.0.0 or higher)
   ```bash
   node --version  # Should output v18.0.0 or higher
   ```

2. **Azure CLI** installed and configured
   ```bash
   # Install Azure CLI (if not already installed)
   # macOS
   brew install azure-cli
   
   # Windows
   winget install Microsoft.AzureCLI
   
   # Linux/WSL
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Azure DevOps Extension** for Azure CLI
   ```bash
   az extension add --name azure-devops
   ```

4. **Azure Authentication**
   ```bash
   # Login to Azure
   az login
   
   # Optional: Set default organization (the tool will auto-configure if not set)
   az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG
   ```

## 🚀 Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g @jybrd/azure-devops-mcp
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/jaybird-us/azure-devops-mcp.git
cd azure-devops-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link globally
npm link
```

## ⚙️ Configuration

### Claude Desktop Setup

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "npx",
      "args": ["@jybrd/azure-devops-mcp"],
      "env": {
        "AZURE_DEVOPS_ORG": "https://dev.azure.com/YOUR_ORG"
      }
    }
  }
}
```

For local development installation:
```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": ["/absolute/path/to/azure-devops-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "https://dev.azure.com/YOUR_ORG"
      }
    }
  }
}
```

### Environment Configuration (Required)

You must configure your Azure DevOps organization in one of two ways:

**Option 1: In Claude Desktop config (Recommended)**
- Add the `"env"` section with your organization URL as shown above

**Option 2: Via Azure CLI**
```bash
az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG
```

## 🛠️ Available Tools

### `list_projects`
Lists all projects in your Azure DevOps organization with details including name, description, state, and visibility.

### `query_work_items`
Query work items using WIQL or built-in shortcuts:
- `"my-items"` - All items assigned to you
- `"my-bugs"` - Bugs assigned to you
- `"my-tasks"` - Tasks assigned to you
- `"recent"` - Recently modified items (last 7 days)
- Custom WIQL queries for advanced filtering

**Parameters:**
- `query` (required): WIQL query or shortcut name
- `project` (optional): Limit results to specific project

### `get_work_item`
Retrieve detailed information about a specific work item.

**Parameters:**
- `id` (required): Work item ID
- `fields` (optional): Comma-separated list of specific fields to retrieve

### `create_work_item`
Create a new work item in Azure DevOps.

**Parameters:**
- `type` (required): Work item type (Task, Bug, User Story, Feature, Epic, Issue)
- `title` (required): Work item title
- `description` (optional): Detailed description
- `assigned_to` (optional): Assignee email or "@Me"
- `tags` (optional): Semicolon-separated tags
- `project` (optional): Target project name

### `update_work_item`
Update an existing work item.

**Parameters:**
- `id` (required): Work item ID
- `title` (optional): New title
- `state` (optional): New state (New, Active, Resolved, Closed, Removed)
- `assigned_to` (optional): New assignee
- `description` (optional): New description
- `comment` (optional): Add a comment with the update

### `add_comment`
Add a comment to an existing work item.

**Parameters:**
- `id` (required): Work item ID
- `comment` (required): Comment text

### `list_my_work`
List all work items assigned to you, organized by state.

**Parameters:**
- `include_recently_completed` (optional): Include items completed in the last 7 days

### Sprint & Iteration Tools 🆕

### `list_iterations`
List all iterations/sprints in a project.

**Parameters:**
- `project` (required): Project name
- `team` (optional): Team name
- `depth` (optional): Depth of iteration tree

### `get_current_iteration`
Get the current active sprint/iteration.

**Parameters:**
- `project` (required): Project name
- `team` (optional): Team name

### `get_iteration_work_items`
Get all work items in a specific iteration.

**Parameters:**
- `project` (required): Project name
- `iteration` (required): Iteration name or path

### `move_to_iteration`
Move a work item to a different iteration/sprint.

**Parameters:**
- `id` (required): Work item ID
- `iteration` (required): Target iteration name
- `project` (optional): Project name

### `get_iteration_details`
Get detailed information about an iteration including work items grouped by type and state.

**Parameters:**
- `project` (required): Project name
- `iteration` (required): Iteration name

### `get_iteration_capacity`
Get iteration capacity and team information.

**Parameters:**
- `project` (required): Project name
- `iteration` (required): Iteration name
- `team` (optional): Team name

## 💬 Usage Examples

Once configured, you can ask Claude:

- "List all my Azure DevOps projects"
- "Show me my active work items"
- "Create a new bug titled 'Login page error' in the WebApp project"
- "Add a comment to work item 754 saying 'Fixed in latest commit'"
- "Update task 281 to Completed state"
- "What bugs are assigned to me?"
- "Show me work items that changed this week"
- "List all sprints in the WebApp project"
- "What's in our current sprint?"
- "Move task 123 to the next sprint"
- "Show me all work items in Sprint 5"
- "Get details about Sprint 3"

## 🔧 Development

### Running from Source

```bash
# Install dependencies
npm install

# Run in development mode (with TypeScript)
npm run dev

# Build for production
npm run build

# Run production build
node dist/index.js
```

### Project Structure

```
azure-devops-mcp/
├── src/
│   └── index.ts         # Main server implementation
├── dist/
│   └── index.js         # Compiled JavaScript (generated)
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript configuration
├── README.md            # This file
└── LICENSE              # MIT license
```

## 🐛 Troubleshooting

### Common Issues

1. **"Error: Cannot find module"**
   - Run `npm install` to install dependencies
   - Ensure you've built the project with `npm run build`

2. **"az: command not found"**
   - Install Azure CLI following the prerequisites section
   - Ensure Azure CLI is in your system PATH

3. **"ERROR: Access Denied"**
   - Run `az login` to authenticate
   - Verify you have appropriate permissions in Azure DevOps

4. **"Organization not configured"**
   - The tool will auto-configure, but you can manually set:
   ```bash
   az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG
   ```

### Debug Mode

To see detailed error messages, run the server directly:
```bash
node dist/index.js
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is an unofficial tool that interfaces with Azure DevOps through the Azure CLI. It is not affiliated with or endorsed by Microsoft Corporation. Azure DevOps is a trademark of Microsoft Corporation.

Users must have their own Azure DevOps account and appropriate licenses to use Azure DevOps services. This tool simply provides an interface to interact with Azure DevOps through the Model Context Protocol.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Built for use with [Claude](https://claude.ai) by Anthropic
- Powered by [Azure DevOps](https://azure.microsoft.com/services/devops/) and Azure CLI
- Implements the [Model Context Protocol](https://modelcontextprotocol.io)

## 📧 Support

For issues, questions, or suggestions, please [open an issue](https://github.com/jaybird-us/azure-devops-mcp/issues) on GitHub.

---

Made with ❤️ for the MCP community
