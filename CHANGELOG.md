# Changelog

All notable changes to the Azure DevOps MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of Azure DevOps MCP Server
- List all projects in Azure DevOps organization
- Query work items using WIQL or predefined shortcuts
- Create new work items (Tasks, Bugs, User Stories, Features, Epics, Issues)
- Update existing work items (title, state, assignee, description)
- Add comments to work items
- List personal work items organized by state
- Smart query shortcuts: `my-items`, `my-bugs`, `my-tasks`, `recent`
- Automatic organization configuration
- Support for custom WIQL queries
- Comprehensive error handling and logging

### Security
- Secure authentication through Azure CLI
- No credentials stored in the application

### Documentation
- Comprehensive README with installation and usage instructions
- Full API documentation for all tools
- Troubleshooting guide
- Contributing guidelines

## [Unreleased]

### Planned Features
- Batch operations for multiple work items
- Work item relationships and links management
- Sprint and iteration support
- Board and backlog operations
- Advanced filtering and search capabilities
- Export functionality (CSV, JSON)
- Work item templates
- Custom field support
- Webhook integration for real-time updates

---

For more information about changes, please see the [commit history](https://github.com/yourusername/azure-devops-mcp/commits/main).
