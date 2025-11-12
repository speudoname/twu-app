# TWU Project - Development Workflow for Claude

## Project Overview
TWU (Time Well Used) is a task management application with:
- **Local Development**: `/Users/apple/twu` (Mac localhost)
- **Production**: DigitalOcean droplet at `104.236.100.157`
- **GitHub**: https://github.com/speudoname/twu-app
- **Live URL**: https://104-236-100-157.nip.io

## Critical Database Synchronization Rules

⚠️ **IMPORTANT**: The SQLite database file (`backend/data/twu.db`) is the SINGLE SOURCE OF TRUTH and must be kept synchronized between local and production.

### Database Workflow

#### 🟢 START of Work Session
**ALWAYS** download the database from production FIRST:
```bash
./scripts/db-download.sh
```
This ensures you're working with the latest production data.

#### 🔴 END of Work Session (or after DB changes)
**ALWAYS** upload the database to production:
```bash
./scripts/db-upload.sh
```
This syncs your local changes to production.

### When to Sync Database

**Download from Production (db-download.sh):**
- At the start of every work session
- Before making any database changes
- Before testing with production data
- When user reports data issues

**Upload to Production (db-upload.sh):**
- After adding/modifying users
- After making schema changes
- After configuring admin settings
- At the end of work session
- Before deploying code changes

## Complete Development Workflow

### Daily Workflow

1. **Start of Session**
   ```bash
   cd /Users/apple/twu

   # Download latest database
   ./scripts/db-download.sh

   # Start local servers (if not running)
   cd backend && npm run dev &
   cd ../frontend && npm run dev &
   ```

2. **During Development**
   - Make code changes
   - Test on localhost:3001
   - Local backend: localhost:3000
   - Local uses downloaded production database

3. **Committing Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

4. **End of Session / After DB Changes**
   ```bash
   # Upload database to production
   ./scripts/db-upload.sh

   # Deploy code changes
   ./deploy.sh
   ```

## File Structure

### What Gets Synced Where

| File/Folder | Local | GitHub | Production | Notes |
|------------|-------|--------|------------|-------|
| Source code (*.js, *.jsx) | ✓ | ✓ | ✓ | Via git push & deploy |
| .env | ✓ | ✗ | ✓ | Manually created, never in git |
| backend/data/twu.db | ✓ | ✗ | ✓ | Via db-download/upload scripts |
| node_modules/ | ✓ | ✗ | ✓ | Generated via npm install |
| frontend/build/ | ✗ | ✗ | ✓ | Generated during deployment |

## Deployment Commands

### Quick Reference

```bash
# Download production database
./scripts/db-download.sh

# Upload local database to production
./scripts/db-upload.sh

# Deploy code changes (no database)
./deploy.sh

# Full deployment (code + database)
./scripts/db-upload.sh && ./deploy.sh
```

### What Each Script Does

**`db-download.sh`**
- Downloads `twu.db` from droplet to local
- Creates backup of local database before overwriting
- Safe to run anytime

**`db-upload.sh`**
- Uploads local `twu.db` to droplet
- Creates backup on droplet before overwriting
- Restarts backend PM2 process
- Use after database changes

**`deploy.sh`**
- Pulls latest code from GitHub on droplet
- Installs dependencies
- Builds frontend
- Restarts backend
- Does NOT touch database

## Common Scenarios

### Scenario 1: User Reports Bug (Code Only)
```bash
# 1. Download latest DB to reproduce issue
./scripts/db-download.sh

# 2. Fix bug locally and test

# 3. Commit and deploy
git add . && git commit -m "Fix: bug description"
git push origin main
./deploy.sh
```

### Scenario 2: Adding New Feature (Code + DB Changes)
```bash
# 1. Download latest DB
./scripts/db-download.sh

# 2. Make changes (code + database)

# 3. Test locally

# 4. Upload DB and deploy
./scripts/db-upload.sh
git add . && git commit -m "Feature: description"
git push origin main
./deploy.sh
```

### Scenario 3: User Needs Password Reset (DB Only)
```bash
# 1. Download DB
./scripts/db-download.sh

# 2. Update user in local database

# 3. Upload DB back
./scripts/db-upload.sh
```

### Scenario 4: Configuring Admin Settings
```bash
# 1. Download DB
./scripts/db-download.sh

# 2. Login to admin panel locally (localhost:3001)
# 3. Configure email settings (Postmark, etc.)

# 4. Upload DB to production
./scripts/db-upload.sh
```

## Database Backup Strategy

All sync scripts automatically create backups:

**Local Backups**: `/Users/apple/twu/backend/data/twu.db.backup.YYYYMMDD_HHMMSS`

**Production Backups**: `/var/www/twu/backend/data/twu.db.backup.YYYYMMDD_HHMMSS`

To restore a backup:
```bash
# Local
cp backend/data/twu.db.backup.20250112_143000 backend/data/twu.db

# Production
ssh root@104.236.100.157 "cp /var/www/twu/backend/data/twu.db.backup.20250112_143000 /var/www/twu/backend/data/twu.db && cd /var/www/twu/backend && pm2 restart twu"
```

## Production Server Details

**SSH Access**: `ssh root@104.236.100.157`

**Application Path**: `/var/www/twu`

**PM2 Process**: `twu`

**Useful Commands**:
```bash
# View logs
ssh root@104.236.100.157 "pm2 logs twu"

# Restart backend
ssh root@104.236.100.157 "pm2 restart twu"

# Check status
ssh root@104.236.100.157 "pm2 status"

# View database backups
ssh root@104.236.100.157 "ls -lh /var/www/twu/backend/data/*.backup.*"
```

## Admin Credentials

**Email**: levan@sarke.ge
**Password**: levan0488

Use these to:
- Access admin panel at `/admin/settings`
- Configure Postmark email settings
- View platform statistics
- Test functionality

## Important Notes

1. **Never commit .env or .db files to GitHub** - They are in .gitignore
2. **Always download DB before starting work** - Ensures you have latest data
3. **Always upload DB after making changes** - Keeps production in sync
4. **Database is NOT deployed with code** - Use separate sync scripts
5. **Backups are automatic** - Every sync creates a timestamped backup
6. **Local and Production are identical** - Same Node.js, same code, same dependencies

## Troubleshooting

### Database sync fails
- Check SSH connection: `ssh root@104.236.100.157`
- Check file exists: `ls -la backend/data/twu.db`
- Check droplet disk space: `ssh root@104.236.100.157 "df -h"`

### Deploy fails
- Check GitHub connection: `git status`
- Check droplet can reach GitHub: `ssh root@104.236.100.157 "git -C /var/www/twu pull"`
- View PM2 logs: `ssh root@104.236.100.157 "pm2 logs twu --lines 50"`

### Application not loading
- Check Nginx: `ssh root@104.236.100.157 "nginx -t && systemctl status nginx"`
- Check PM2: `ssh root@104.236.100.157 "pm2 status"`
- Check SSL: `curl -I https://104-236-100-157.nip.io`

## Development Tips

1. **Keep servers running** - Backend and frontend dev servers can stay running
2. **Hot reload works** - Changes to code auto-reload in browser
3. **Database changes need restart** - Restart backend after DB schema changes
4. **Test before deploying** - Always test locally first
5. **Commit frequently** - Small commits are easier to debug
6. **Sync DB strategically** - Don't upload incomplete/test data to production

## Contact

Project maintained by Levan Bakhia
Repository: https://github.com/speudoname/twu-app