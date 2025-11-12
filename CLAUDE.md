# TWU Project - Development Workflow

## Quick Overview
- **Local**: `/Users/apple/twu` - Development on Mac localhost
- **Production**: `https://104-236-100-157.nip.io` - Live on DigitalOcean
- **GitHub**: https://github.com/speudoname/twu-app - Code repository
- **Admin**: levan@sarke.ge / levan0488

## The Complete Workflow

### 1. Start Working
```bash
./scripts/db-download.sh    # Download production database
# Now work locally - make changes, test on localhost:3001
```

### 2. Save Changes
```bash
git add .
git commit -m "Your changes"
git push origin main         # Saves to GitHub (does NOT deploy)
```

### 3. Deploy to Production
```bash
./scripts/db-upload.sh       # Upload database (if changed)
git tag v1.0.1               # Create release tag
git push origin v1.0.1       # AUTO-DEPLOYS to DigitalOcean
```

## Database Sync Rules

⚠️ **CRITICAL**: Database must stay synchronized

**Download (START of work):**
```bash
./scripts/db-download.sh
```
- Every morning before work
- When testing with real data
- After users report issues

**Upload (AFTER changes):**
```bash
./scripts/db-upload.sh
```
- After modifying users, settings, or data
- Before deploying code changes
- End of work session

## What Gets Deployed

**Automatic deployment (git tag push):**
- ✅ Code changes
- ✅ Dependencies (npm packages)
- ✅ Frontend build
- ❌ Database (separate sync required)

**Manual sync (scripts):**
- Database file (`twu.db`) via upload/download scripts

## Monitoring

**PM2 Web Dashboard:** https://app.pm2.io
- Real-time monitoring, logs, alerts

**Scripts:**
```bash
./scripts/pm2-status.sh      # Check status
./scripts/pm2-logs.sh         # View logs
./scripts/server-health.sh    # Health check
```

## Architecture

**Local = Production:**
- Same Node.js code
- Same SQLite database (synced manually)
- Same dependencies
- Same behavior

**Only differences:**
- URLs: `localhost:3001` vs `https://104-236-100-157.nip.io`
- Process: Manual start vs PM2 auto-management

## Key Points

✅ `git push origin main` = Save to GitHub (no deployment)
✅ `git push origin v*` = Auto-deploy to production
✅ Database synced separately (not part of git/deployment)
✅ Local and production are identical systems
✅ PM2 is just process management (not part of your app)

## Quick Examples

**Bug fix (code only):**
```bash
./scripts/db-download.sh
# Fix bug, test
git add . && git commit -m "Fix bug"
git push origin main
git tag v1.0.1 && git push origin v1.0.1
```

**New feature (code + DB):**
```bash
./scripts/db-download.sh
# Build feature, test
./scripts/db-upload.sh
git add . && git commit -m "New feature"
git push origin main
git tag v1.1.0 && git push origin v1.1.0
```

## Backups

Auto-created on every sync:
- Local: `backend/data/twu.db.backup.YYYYMMDD_HHMMSS`
- Production: `/var/www/twu/backend/data/twu.db.backup.YYYYMMDD_HHMMSS`

---

**For detailed documentation see:**
- `QUICK_REFERENCE.md` - Quick commands
- `PM2_GUIDE.md` - PM2 process manager
- `TOOLS_REFERENCE.md` - All tools and monitoring
- `PROJECT_SPEC.md` - Technical specifications