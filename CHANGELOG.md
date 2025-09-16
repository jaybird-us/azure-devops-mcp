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

## [1.1.0] - 2025-01-15

### Added
- Sprint and iteration support with 6 new tools:
  - `list_iterations` - List all iterations/sprints in a project
  - `get_current_iteration` - Get the current active sprint
  - `get_iteration_work_items` - Get all work items in a specific iteration
  - `move_to_iteration` - Move work items between sprints
  - `get_iteration_details` - Get detailed iteration statistics
  - `get_iteration_capacity` - Check team capacity for iterations
- Proper modular structure with separate handlers and types
- Import ensureOrgConfigured from helpers module

### Improved
- Better code organization with handlers and types directories
- Enhanced iteration management capabilities for Agile teams

## [1.0.1] - 2025-01-15

### Fixed
- Removed hardcoded organization URL
- Added environment variable support for organization configuration
- Updated documentation with correct package name (@jybrd/azure-devops-mcp)
- Fixed installation instructions in README

### Changed
- Organization configuration now required via environment variable or Azure CLI
- Improved error messages for missing configuration

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

For more information about changes, please see the [commit history](https://github.com/jaybird-us/azure-devops-mcp/commits/main).
