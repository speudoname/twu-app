# TWU - Complete Tools Reference

Quick reference for all available management tools and commands.

## 📋 Table of Contents

1. [Database Management](#database-management)
2. [Deployment](#deployment)
3. [PM2 Process Manager](#pm2-process-manager)
4. [Server Health](#server-health)
5. [Development](#development)

---

## Database Management

### Download Database from Production
```bash
./scripts/db-download.sh
```
Downloads production database to local for development.

### Upload Database to Production
```bash
./scripts/db-upload.sh
```
Uploads local database changes to production.

**When to use:**
- Start of work: Download
- End of work (with DB changes): Upload
- After adding users, admin settings, etc.

---

## Deployment

### Automatic Deployment (Recommended)
```bash
# Create and push release tag
git tag v1.0.1
git push origin v1.0.1
```
Automatically deploys to DigitalOcean via GitHub Actions.

### Manual Deployment
```bash
./deploy.sh
```
Manually deploy code changes (useful for troubleshooting).

**Version Numbering:**
- `v1.0.0` - Major release
- `v1.0.1` - Bug fix
- `v1.1.0` - New feature
- `v2.0.0` - Breaking change

---

## PM2 Process Manager

### Check PM2 Status
```bash
./scripts/pm2-status.sh
```
View detailed process information, uptime, and resource usage.

### View Logs
```bash
# Last 50 lines (default)
./scripts/pm2-logs.sh

# Specific number of lines
./scripts/pm2-logs.sh 100
```

### Restart Application
```bash
./scripts/pm2-restart.sh
```
Restart the backend Node.js process.

### Direct PM2 Commands (SSH)
```bash
ssh root@104.236.100.157

# Common commands:
pm2 list              # List processes
pm2 logs twu          # Live logs
pm2 restart twu       # Restart
pm2 stop twu          # Stop
pm2 start twu         # Start
pm2 monit             # Real-time monitoring
```

**See:** `PM2_GUIDE.md` for complete PM2 documentation.

---

## Server Health

### Complete Health Check
```bash
./scripts/server-health.sh
```
Checks:
- CPU & Memory usage
- Disk space
- Nginx status
- PM2 processes
- Recent logs
- API health

### Quick API Check
```bash
curl https://104-236-100-157.nip.io/api/health
```

### SSH into Server
```bash
ssh root@104.236.100.157
```

---

## Development

### Start Local Development
```bash
# Backend (port 3000)
cd backend
npm run dev

# Frontend (port 3001)
cd frontend
npm run dev
```

### Git Workflow
```bash
# Daily commits (no deployment)
git add .
git commit -m "Your changes"
git push origin main

# Deploy when ready
git tag v1.0.1
git push origin v1.0.1
```

### Full Workflow Example
```bash
# 1. Start of day - get latest data
./scripts/db-download.sh

# 2. Make changes and test locally
# ... code changes ...

# 3. Commit changes
git add .
git commit -m "Add new feature"
git push origin main

# 4. Upload database if changed
./scripts/db-upload.sh

# 5. Deploy to production
git tag v1.1.0
git push origin v1.1.0

# 6. Verify deployment
./scripts/server-health.sh
```

---

## Common Scenarios

### Scenario 1: Application Down
```bash
# Check if PM2 is running
./scripts/pm2-status.sh

# Restart if needed
./scripts/pm2-restart.sh

# Check logs for errors
./scripts/pm2-logs.sh 50
```

### Scenario 2: Slow Performance
```bash
# Check server resources
./scripts/server-health.sh

# View process details
ssh root@104.236.100.157 "pm2 describe twu"

# Restart to free memory
./scripts/pm2-restart.sh
```

### Scenario 3: Deploy New Feature
```bash
# Download DB, make changes, test
./scripts/db-download.sh
# ... development ...

# Upload DB and deploy
./scripts/db-upload.sh
git add . && git commit -m "New feature"
git push origin main
git tag v1.1.0 && git push origin v1.1.0
```

### Scenario 4: Rollback to Previous Version
```bash
# SSH into server
ssh root@104.236.100.157

# Checkout previous tag
cd /var/www/twu
git checkout v1.0.0

# Restart
pm2 restart twu
```

### Scenario 5: View Recent Activity
```bash
# View logs
./scripts/pm2-logs.sh 100

# Or check GitHub Actions
gh run list --repo speudoname/twu-app
```

---

## URLs

| Environment | URL | Purpose |
|------------|-----|---------|
| **Local Frontend** | http://localhost:3001 | Development |
| **Local Backend** | http://localhost:3000 | API testing |
| **Production** | https://104-236-100-157.nip.io | Live site |
| **GitHub** | https://github.com/speudoname/twu-app | Code repository |

---

## Admin Credentials

**Email:** levan@sarke.ge
**Password:** levan0488

**Access:**
- Local: http://localhost:3001/admin/settings
- Production: https://104-236-100-157.nip.io/admin/settings

---

## Monitoring & Logs

### Real-time Logs
```bash
ssh root@104.236.100.157 "pm2 logs twu"
```

### Error Logs Only
```bash
ssh root@104.236.100.157 "pm2 logs twu --err"
```

### View Log Files
```bash
ssh root@104.236.100.157
tail -f /root/.pm2/logs/twu-out.log
tail -f /root/.pm2/logs/twu-error.log
```

### GitHub Actions Logs
```bash
# List recent deployments
gh run list --repo speudoname/twu-app

# View specific deployment
gh run view --repo speudoname/twu-app
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and setup |
| `PROJECT_SPEC.md` | Complete technical specifications |
| `CLAUDE.md` | Development workflow for Claude |
| `QUICK_REFERENCE.md` | Quick command reference |
| `PM2_GUIDE.md` | Complete PM2 documentation |
| `TOOLS_REFERENCE.md` | This file - all tools reference |

---

## Emergency Contacts

**Droplet IP:** 104.236.100.157
**SSH Access:** `ssh root@104.236.100.157`
**Repository:** https://github.com/speudoname/twu-app
**Domain:** https://104-236-100-157.nip.io

---

## Pro Tips

1. **Always download DB first** - `./scripts/db-download.sh`
2. **Commit often** - Small commits are easier to debug
3. **Deploy with tags** - Only push tags when ready
4. **Monitor after deploy** - `./scripts/server-health.sh`
5. **Check logs regularly** - `./scripts/pm2-logs.sh`
6. **Backup database** - Automatic on every sync
7. **Test locally first** - Before deploying to production

---

**Last Updated:** 2025-11-12
**Version:** 1.0.0