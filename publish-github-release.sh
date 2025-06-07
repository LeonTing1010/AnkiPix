#!/bin/zsh
# Publish a new GitHub release for AnkiPix using version from manifest.json
# Usage: ./publish-github-release.sh "Release notes here"

set -e

# Get version from manifest.json
VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*: "([^"]+)",?/\1/')
TAG="v$VERSION"

# Check that all required release files exist
for f in release/main.js release/manifest.json release/styles.css release/ankipix-obsidian-plugin.zip; do
  if [[ ! -f "$f" ]]; then
    echo "Error: $f not found. Please build the release first."
    exit 1
  fi
done

# Create a git tag for this version if it does not already exist
git tag | grep -q "^$TAG$" || git tag "$TAG"

git push origin "$TAG"

# Create a GitHub release using the gh CLI
# The release will be named after the version and include the specified files as assets
RELEASE_TITLE="AnkiPix $VERSION"
RELEASE_NOTES=${1:-"Release $VERSION"}

gh release create "$TAG" \
  --title "$RELEASE_TITLE" \
  --notes "$RELEASE_NOTES" \
  release/main.js \
  release/manifest.json \
  release/styles.css \
  release/ankipix-obsidian-plugin.zip

echo "GitHub release $TAG published with assets."
