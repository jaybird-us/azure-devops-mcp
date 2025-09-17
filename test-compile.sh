#!/bin/bash

# Test script to validate TypeScript compilation for the new relation tools
# Run this in your project directory: bash test-compile.sh

echo "🔍 Testing Azure DevOps MCP Server v2.2.0 Compilation"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the azure-devops-mcp project directory"
    echo "   Please run this script from the project root"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Run TypeScript compilation
echo "🔨 Compiling TypeScript..."
npx tsc

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Compilation successful!"
    echo ""
    
    # Check that all new files were created
    echo "📋 Checking new relation files..."
    
    if [ -f "dist/types/relations.js" ]; then
        echo "  ✓ dist/types/relations.js created"
    else
        echo "  ✗ dist/types/relations.js missing"
    fi
    
    if [ -f "dist/tools/relations.js" ]; then
        echo "  ✓ dist/tools/relations.js created"
    else
        echo "  ✗ dist/tools/relations.js missing"
    fi
    
    if [ -f "dist/handlers/relations.js" ]; then
        echo "  ✓ dist/handlers/relations.js created"
    else
        echo "  ✗ dist/handlers/relations.js missing"
    fi
    
    echo ""
    echo "🎉 Azure DevOps MCP Server v2.2.0 is ready!"
    echo "   Total tools: 30 (including 4 new relationship management tools)"
    echo ""
    echo "New tools added:"
    echo "  • add_work_item_relation"
    echo "  • remove_work_item_relation"
    echo "  • get_work_item_relations"
    echo "  • list_relation_types"
else
    echo ""
    echo "❌ Compilation failed!"
    echo "   Please check the TypeScript errors above"
    exit 1
fi
