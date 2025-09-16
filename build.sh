#!/bin/bash

# Azure DevOps MCP Server - Build Script

echo "🚀 Building Azure DevOps MCP Server..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx tsc

# Check if build was successful
if [ -f dist/index.js ]; then
    # Make the output executable
    chmod +x dist/index.js
    
    # Add shebang if missing
    if ! grep -q "^#!/usr/bin/env node" dist/index.js; then
        echo '#!/usr/bin/env node' | cat - dist/index.js > temp && mv temp dist/index.js
    fi
    
    echo "✅ Build successful!"
    echo "📍 Output: dist/index.js"
    echo ""
    echo "To run the server:"
    echo "  node dist/index.js"
    echo ""
    echo "To install globally:"
    echo "  npm link"
else
    echo "❌ Build failed! Check for TypeScript errors."
    exit 1
fi
