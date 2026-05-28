#!/bin/bash
# =========================================================================
# e-politica.ia - Git Remote Repository Linking & Push Script
# =========================================================================
# Run this script to link your local repository to GitHub and push your code.
# 
# Usage:
#   chmod +x scratch/git_push.sh
#   ./scratch/git_push.sh <YOUR_GITHUB_REPO_URL>
# 
# Example:
#   ./scratch/git_push.sh https://github.com/luizfernandodecamargoalves/e-politica-ia.git
# =========================================================================

REPO_URL=$1

if [ -z "$REPO_URL" ]; then
  echo "Error: Please provide your GitHub repository URL."
  echo "Usage: ./scratch/git_push.sh <YOUR_GITHUB_REPO_URL>"
  exit 1
fi

echo "Linking local repository to: $REPO_URL..."
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL"

echo "Setting main branch..."
git branch -M main

echo "Pushing code to GitHub..."
git push -u origin main

echo "========================================================================="
echo "Done! Your code is now successfully versioned on GitHub."
echo "========================================================================="
