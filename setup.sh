#!/bin/bash

# Azure DevOps MCP Server - Quick Setup Script

echo "🚀 Azure DevOps MCP Server - Quick Setup"
echo "========================================="
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "⚠️  Azure CLI is not installed."
    echo "   Install instructions: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Azure CLI detected"
    
    # Check Azure DevOps extension
    if az extension show --name azure-devops &> /dev/null; then
        echo "✅ Azure DevOps extension installed"
    else
        echo "📦 Installing Azure DevOps extension..."
        az extension add --name azure-devops
    fi
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

if [ -f dist/index.js ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Configure Azure CLI (if not already done):"
    echo "   az login"
    echo "   az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG"
    echo ""
    echo "2. Add to Claude Desktop configuration:"
    echo "   Location: ~/Library/Application Support/Claude/claude_desktop_config.json"
    echo "   Add the following:"
    echo '   {
     "mcpServers": {
       "azure-devops": {
         "command": "node",
         "args": ["'$(pwd)'/dist/index.js"]
       }
     }
   }'
    echo ""
    echo "3. Restart Claude Desktop"
    echo ""
    echo "For more information, see README.md"
else
    echo "❌ Build failed. Please check for errors above."
    exit 1
fi
