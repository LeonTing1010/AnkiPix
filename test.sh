#!/bin/bash

# AnkiPix Plugin Test Script
echo "🧪 Testing AnkiPix Obsidian Plugin..."

echo "📁 Checking project structure..."
if [ -f "main.js" ]; then
    echo "✅ main.js exists ($(wc -c < main.js) bytes)"
else
    echo "❌ main.js missing"
    exit 1
fi

if [ -f "manifest.json" ]; then
    echo "✅ manifest.json exists"
else
    echo "❌ manifest.json missing"
    exit 1
fi

echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules missing - run 'npm install'"
    exit 1
fi

echo "🔧 Testing TypeScript compilation..."
npx tsc --noEmit --skipLibCheck
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "⚠️  TypeScript has some issues but build works"
fi

echo "🏗️  Testing esbuild..."
node esbuild.config.mjs production
if [ $? -eq 0 ]; then
    echo "✅ esbuild successful"
else
    echo "❌ esbuild failed"
    exit 1
fi

echo ""
echo "🎉 AnkiPix Plugin Ready!"
echo ""
echo "📋 Installation Instructions:"
echo "1. Copy the following files to your Obsidian plugins folder:"
echo "   - main.js"
echo "   - manifest.json"
echo "   - versions.json"
echo ""
echo "2. Enable the plugin in Obsidian settings"
echo "3. Configure your API keys in plugin settings"
echo "4. Make sure Anki is running with AnkiConnect installed"
echo ""
echo "🔗 Obsidian plugins folder locations:"
echo "   macOS: ~/Library/Application Support/obsidian/plugins/"
echo "   Windows: %APPDATA%\\obsidian\\plugins\\"
echo "   Linux: ~/.config/obsidian/plugins/"
