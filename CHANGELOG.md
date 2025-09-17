# Changelog

All notable changes to the Azure DevOps MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-16

### Fixed
- **Critical:** Fixed 12 broken tools that were using non-existent Azure CLI commands
- Discovery tools now use Azure DevOps REST API via `az devops invoke`
- `list_my_work` now dynamically resolves ClosedDate field for different process templates
- `check_field_exists` tool now properly validates field existence
- Iteration tools now work correctly:
  - `move_to_iteration` uses correct `--iteration` parameter
  - `get_iteration_details` uses list command instead of show (which requires GUID)
- Work item tools now handle @Me token:
  - Resolves @Me to current user's email address
  - Falls back to unassigned if email can't be determined

### Added
- REST API infrastructure (`azureDevOpsInvoke.ts`) for calling Azure DevOps APIs
- Field resolver system (`fieldResolver.ts`) for handling process template differences
- Adaptive field resolution for process template compatibility
- Automatic field discovery and caching
- Enhanced error handling with specific error messages
- REST API health check in healthcheck tool
- `resolveAssignedTo()` helper for @Me token resolution

### Changed
- All discovery tools now use REST API instead of Azure CLI commands
- Field references are now dynamically resolved based on available fields
- No more hardcoded field assumptions (except System.* fields)
- Total tool count from 31 to 26

### Removed
- Query management tools (5 tools removed for improved reliability):
  - `list_saved_queries`
  - `run_saved_query`
  - `create_saved_query`
  - `update_saved_query`
  - `delete_saved_query`

### Technical Details
- Implemented `az devops invoke` wrapper for REST API calls
- Field resolver caches discovered fields for performance
- Graceful fallback when fields don't exist in process template
- Temp file handling for POST/PATCH request bodies
- API version 7.1 used consistently
- Improved error handling in iteration handlers
- Better field existence checking with fallbacks

## [2.0.0] - 2025-01-15

### Added
- Version 2.0 major release with 31 total tools
- Complete refactor for improved modularity

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
