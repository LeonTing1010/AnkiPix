#!/bin/bash

# AnkiPix Plugin Release Builder
echo "📦 Building AnkiPix Release Package..."

# Run build step
echo "🔨 Running npm run build..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Aborting release."
  exit 1
fi

# Create release directory
mkdir -p release

# Copy essential files
echo "📁 Copying release files..."
if [ ! -f release/main.js ]; then
  echo "❌ Error: main.js not found. Please run 'npm run build' first."
  exit 1
fi
# cp main.js release/
cp manifest.json release/
cp styles.css release/
# cp versions.json release/
# cp README.md release/

# Create installation zip
echo "🗜️  Creating installation package..."
cd release
zip -r ankipix-obsidian-plugin.zip *
cd ..

echo "✅ Release package created: ankipix-obsidian-plugin.zip"
echo ""
echo "📋 Manual Installation Instructions:"
echo "1. Extract ankipix-obsidian-plugin.zip"
echo "2. Copy files to: [Obsidian vault]/.obsidian/plugins/ankipix/"
echo "3. Restart Obsidian and enable the plugin"
echo ""
echo "📊 Package contents:"
ls -la release/
