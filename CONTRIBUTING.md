# Contributing to Azure DevOps MCP Server

First off, thank you for considering contributing to the Azure DevOps MCP Server! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and considerate in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and expected**
- **Include logs and error messages**
- **Note your environment** (OS, Node version, Azure CLI version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes**
4. **Test your changes**: Ensure the server runs and your changes work
5. **Update documentation** if needed
6. **Commit your changes** using clear commit messages
7. **Push to your fork** and submit a pull request

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/azure-devops-mcp.git
   cd azure-devops-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Azure CLI:
   ```bash
   az login
   az extension add --name azure-devops
   az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Style Guide

### TypeScript Style

- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Example:
```
Add support for work item templates

- Implement template creation and management
- Add new tool: create_from_template
- Update documentation with template examples

Fixes #123
```

### Documentation

- Update the README.md if you change functionality
- Update tool descriptions in the code
- Add JSDoc comments for new functions
- Update CHANGELOG.md for significant changes

## Testing

Currently, the project doesn't have automated tests. When adding new features:

1. Test with Claude Desktop to ensure MCP integration works
2. Test all affected tools manually
3. Test error cases and edge conditions
4. Verify Azure CLI commands work as expected

Future goal: Add comprehensive test suite.

## Adding New Tools

When adding a new tool:

1. **Define the tool** in the appropriate file under `src/tools/`:
   - `workitems.ts` for work item operations
   - `discovery.ts` for field/type discovery tools
   - `projects.ts` for project management tools
   - `iterations.ts` for sprint/iteration tools

2. **Implement the handler** in the corresponding handler file under `src/handlers/`

3. **Add the case** in `src/index.ts` CallToolRequestSchema switch

4. **Update the tool count** in index.ts console message

5. **Update documentation**:
   - README.md with tool description
   - mcp.json with tool metadata
   - CHANGELOG.md with the addition

6. **Test with various parameter combinations**

Example structure:
```typescript
// In src/tools/workitems.ts (or appropriate tool file)
export const workItemTools: ToolDefinition[] = [
  // ... existing tools
  {
    name: 'your_new_tool',
    description: 'Clear description of what it does',
    inputSchema: {
      type: 'object',
      properties: {
        // Define parameters
      },
      required: ['required_params'],
    },
  },
];

// In src/handlers/workitems.ts (or appropriate handler file)
export async function handleYourNewTool(args: any): Promise<HandlerResult> {
  await ensureOrgConfigured();
  // Implementation
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2),
    }],
  };
}

// In src/index.ts CallToolRequestSchema handler
case 'your_new_tool':
  result = await workItemHandlers.handleYourNewTool(args);
  break;
```

## Project Structure

```
azure-devops-mcp/
├── src/
│   ├── index.ts         # Main server implementation
│   ├── types.ts         # TypeScript type definitions
│   ├── tools/           # Tool definitions
│   │   ├── index.ts     # Combined tool exports
│   │   ├── workitems.ts # Work item tool definitions
│   │   ├── discovery.ts # Discovery tool definitions
│   │   ├── projects.ts  # Project tool definitions
│   │   └── iterations.ts# Iteration tool definitions
│   ├── handlers/        # Tool implementation handlers
│   │   ├── workitems.ts # Work item handlers
│   │   ├── discovery.ts # Discovery handlers
│   │   ├── projects.ts  # Project handlers
│   │   └── iterations.ts# Iteration handlers
│   ├── helpers/         # Utility functions
│   │   ├── ensureOrg.ts # Organization configuration
│   │   ├── queryBuilder.ts # WIQL query builder
│   │   ├── fieldResolver.ts # Field resolution
│   │   └── azureDevOpsInvoke.ts # REST API wrapper
│   └── types/           # Additional type definitions
│       └── iterations.ts # Iteration types
├── dist/                # Compiled output (generated)
│   └── index.js
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── README.md            # User documentation
├── CONTRIBUTING.md      # This file
├── CHANGELOG.md         # Version history
├── LICENSE              # MIT license
└── mcp.json            # MCP manifest
```

## Questions?

Feel free to [open an issue](https://github.com/jaybird-us/azure-devops-mcp/issues) for questions or discussions.

## Recognition

Contributors will be recognized in the README and release notes. Thank you for helping make this tool better!
