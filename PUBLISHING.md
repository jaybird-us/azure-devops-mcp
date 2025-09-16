# Publishing Checklist for Azure DevOps MCP Server

## Pre-Publication Checklist

### ✅ Code Quality
- [ ] All TypeScript compiles without errors
- [ ] No hardcoded credentials or sensitive data
- [ ] Error handling in place for all Azure CLI commands
- [ ] Meaningful error messages for users

### ✅ Documentation
- [ ] README.md is complete and professional
- [ ] All tools documented with examples
- [ ] Installation instructions clear and tested
- [ ] Troubleshooting section covers common issues
- [ ] CHANGELOG.md updated with latest version
- [ ] LICENSE file included (MIT)

### ✅ Package Configuration
- [ ] package.json has all required fields
- [ ] Version number follows semantic versioning
- [ ] Keywords relevant for discovery
- [ ] Author information correct
- [ ] Repository URLs correct
- [ ] mcp.json manifest complete

### ✅ Build & Test
- [ ] `npm install` works cleanly
- [ ] `npm run build` produces dist/index.js
- [ ] Server starts without errors
- [ ] All tools tested with Claude Desktop
- [ ] Works with fresh Azure DevOps setup

### ✅ Git Repository
- [ ] .gitignore excludes unnecessary files
- [ ] No node_modules or dist in repository
- [ ] All source files committed
- [ ] Tagged with version number
- [ ] GitHub repository public

## Publishing to NPM

1. **Create NPM account** (if needed):
   ```bash
   npm adduser
   ```

2. **Update version** (if needed):
   ```bash
   npm version patch  # or minor/major
   ```

3. **Final build**:
   ```bash
   npm run clean
   npm install
   npm run build
   ```

4. **Dry run** (see what would be published):
   ```bash
   npm pack --dry-run
   ```

5. **Publish to NPM**:
   ```bash
   npm publish
   ```

6. **Verify publication**:
   ```bash
   npm view azure-devops-mcp
   ```

## Publishing to MCP Tools Directory

1. **Ensure NPM package is published**

2. **Submit to MCP directory**:
   - Visit: https://github.com/modelcontextprotocol/tools
   - Fork the repository
   - Add your tool to the appropriate category
   - Submit a Pull Request

3. **PR should include**:
   - Link to NPM package
   - Brief description
   - Link to GitHub repository
   - Badge showing MCP compatibility

## Post-Publication

### ✅ Verification
- [ ] NPM package installs correctly: `npm install -g azure-devops-mcp`
- [ ] Server runs from NPM: `npx azure-devops-mcp`
- [ ] GitHub releases created with changelog
- [ ] Documentation website updated (if applicable)

### ✅ Promotion
- [ ] Tweet announcement (if desired)
- [ ] Post in MCP community forums
- [ ] Update LinkedIn profile with project
- [ ] Consider writing blog post about the tool

### ✅ Maintenance Plan
- [ ] Monitor GitHub issues
- [ ] Respond to user questions
- [ ] Plan for regular updates
- [ ] Keep dependencies updated
- [ ] Follow MCP specification updates

## Version Management

### Semantic Versioning Guidelines
- **PATCH** (1.0.X): Bug fixes, documentation updates
- **MINOR** (1.X.0): New features, backward compatible
- **MAJOR** (X.0.0): Breaking changes

### Release Process
1. Update CHANGELOG.md
2. Update version in package.json
3. Commit changes: `git commit -m "Release v1.0.X"`
4. Tag release: `git tag v1.0.X`
5. Push: `git push && git push --tags`
6. Publish to NPM
7. Create GitHub release with changelog

## Support Channels

### For Users
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: General questions and discussions
- Email: your.email@example.com (update this)

### For Contributors
- CONTRIBUTING.md: Guidelines for contributions
- GitHub Pull Requests: Code contributions
- GitHub Wiki: Extended documentation

## Final Notes

Remember to:
- Update your email in package.json and mcp.json
- Replace "yourusername" with your actual GitHub username
- Test the entire flow with a fresh installation
- Keep your Azure DevOps organization active for testing

Good luck with your publication! 🚀
