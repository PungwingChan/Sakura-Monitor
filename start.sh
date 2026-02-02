#!/bin/bash

# Sakura Monitor - Start Script
# Author: Losy

echo "================================================"
echo "  🌸 Sakura Monitor Starting...  "
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Display Node.js version
echo "✅ Node.js version: $(node --version)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    exit 1
fi

# Check if index.js exists
if [ ! -f "index.js" ]; then
    echo "❌ Error: index.js not found!"
    exit 1
fi

# Install dependencies if needed
if [ -f "package.json" ]; then
    echo ""
    echo "📦 Checking dependencies..."
    
    # Check if node_modules needs to be installed
    if ! [ -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    else
        echo "Dependencies already installed ✓"
    fi
fi

echo ""
echo "================================================"
echo "  🚀 Starting Sakura Monitor Server...  "
echo "================================================"
echo ""

# Start the application
node index.js
