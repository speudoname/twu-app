#!/bin/bash

# TWU Deployment Script
# This script handles the complete deployment process:
# 1. Uploads database to production
# 2. Commits code changes to GitHub
# 3. Creates and pushes release tag (triggers auto-deployment)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if version tag is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Version tag required${NC}"
    echo "Usage: ./scripts/deploy.sh <version> [commit-message]"
    echo "Example: ./scripts/deploy.sh v1.0.2 'Add new feature'"
    exit 1
fi

VERSION=$1
COMMIT_MSG=${2:-"Release $VERSION"}

echo -e "${BLUE}🚀 Starting TWU Deployment${NC}"
echo -e "${BLUE}Version: $VERSION${NC}"
echo ""

# Step 1: Upload database
echo -e "${YELLOW}📤 Step 1/4: Uploading database to production...${NC}"
./scripts/db-upload.sh
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Database upload failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database uploaded${NC}"
echo ""

# Step 2: Git add and commit
echo -e "${YELLOW}💾 Step 2/4: Committing changes to Git...${NC}"
git add .
git commit -m "$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>" || echo "No changes to commit (already committed)"
echo -e "${GREEN}✅ Changes committed${NC}"
echo ""

# Step 3: Push to GitHub
echo -e "${YELLOW}📤 Step 3/4: Pushing to GitHub...${NC}"
git push origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git push failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

# Step 4: Create and push release tag
echo -e "${YELLOW}🏷️  Step 4/4: Creating release tag $VERSION...${NC}"
git tag -a "$VERSION" -m "Release $VERSION

Features/Changes:
$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

git push origin "$VERSION"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tag push failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Release tag pushed${NC}"
echo ""

# Show status
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment initiated successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Status:${NC}"
echo "   • Database: ✅ Uploaded"
echo "   • Code: ✅ Pushed to GitHub"
echo "   • Release: ✅ Tag $VERSION created"
echo "   • GitHub Actions: 🔄 Deploying to droplet..."
echo ""
echo -e "${BLUE}🔗 Monitor deployment:${NC}"
echo "   • GitHub Actions: https://github.com/speudoname/twu-app/actions"
echo "   • PM2 Dashboard: https://app.pm2.io/#/r/irlgcqwelh1fzzl"
echo ""
echo -e "${BLUE}📱 Production URL:${NC}"
echo "   • https://104-236-100-157.nip.io"
echo ""
echo -e "${YELLOW}⏳ Deployment typically takes 30-60 seconds${NC}"
echo -e "${YELLOW}💡 Run './scripts/pm2-status.sh' to check if deployed${NC}"
