# TWU - Time Well Used

## ⚠️ CRITICAL: Database Strategy

**DATABASE IS A FILE - NOT A MIGRATION SYSTEM**

```
backend/data/twu.db
```

### The Rules (DO NOT BREAK THESE):
1. **Local database is the source of truth**
2. **Changes are made LOCALLY to the twu.db file**
3. **Database is UPLOADED to production** (entire file)
4. **NO migrations in production** - we replace the whole file
5. **Always upload database BEFORE deploying code changes**

### When Adding New Columns/Tables:
```bash
# 1. Modify LOCAL database directly
cd backend && node -e "
const db = require('./database/db');
db.prepare('ALTER TABLE tasks ADD COLUMN your_column TYPE').run();
"

# 2. Upload to production
./scripts/db-upload.sh

# 3. Then deploy code
/deploy v1.0.3 "Feature description"
```

### DO NOT:
- ❌ Run migrations on production
- ❌ Think about migrations like Rails/Django
- ❌ Create migration files and expect them to run
- ❌ Deploy code before uploading database

### DO:
- ✅ Make schema changes locally to twu.db
- ✅ Upload the entire database file
- ✅ Test locally with the real database file
- ✅ Upload database FIRST, then deploy code

---

## Quick Start

### Deploy to Production
```
/deploy v1.0.3 "Feature description"
```
One command does everything: database sync, git commit/push, release tag, auto-deployment.

### Check System Status
```
/status
```
Shows git status, deployment status, server health, database sync status.

### Sync Database
```
/sync-db download    # Start of work: get production data
/sync-db upload      # Before deploy: push local changes
```

**That's it!** These three commands handle 95% of your workflow.

---

## Project Info

- **Local Dev**: `http://localhost:3001` (backend) + `http://localhost:5173` (frontend)
- **Production**: https://104-236-100-157.nip.io (PWA enabled)
- **GitHub**: https://github.com/speudoname/twu-app
- **Monitoring**: https://app.pm2.io/#/r/irlgcqwelh1fzzl
- **Admin**: levan@sarke.ge / levan0488

---

## Understanding TWU

### Architecture
**Stack:** Node.js + Express + SQLite + React + Vite

**Why SQLite?**
- Simple deployment (single file)
- No separate database server
- Perfect for single-user apps
- Easy backup/restore

**Deployment Flow:**
```
Local Changes → GitHub (git push + release tag) → GitHub Actions → DigitalOcean Droplet (104.236.100.157)
```

**CRITICAL:** Deployment is triggered ONLY by creating a release tag (v*), not by regular pushes to main!

**Database Sync:**
```
Database is NOT in git (too large, changes frequently)
Must be synced separately using scripts
```

### Key Concepts

**Local = Production (almost)**
- Same code
- Same database structure
- Different data (until you sync)
- Different URLs

**Release Tags Trigger Deployment**
- Push tag `v*` → GitHub Actions runs automatically
- Pulls code, installs deps, builds frontend, restarts PM2
- Takes 30-60 seconds

**Database Must Be Synced Manually**
- Download at start of work
- Upload before deploying code changes
- Backups created automatically

---

## PWA Features

TWU is a Progressive Web App with:
- **Service Worker**: Offline caching
- **Manifest**: App metadata, install prompts
- **Apple Design**: Liquid glass aesthetic with backdrop blur
- **Mobile-First**: Bottom tab navigation (iOS/Android style)
- **Voice Input**: OpenAI Whisper API for inbox transcription

**Install on Mobile:**
1. Visit https://104-236-100-157.nip.io on phone
2. Browser shows "Add to Home Screen" prompt
3. App works offline with cached data

---

## Monitoring

**Real-time:**
- PM2 Dashboard: https://app.pm2.io/#/r/irlgcqwelh1fzzl
- GitHub Actions: https://github.com/speudoname/twu-app/actions

**CLI:**
```bash
/status                      # Quick overview
./scripts/pm2-status.sh      # Detailed server info
./scripts/pm2-logs.sh        # Live logs
./scripts/server-health.sh   # Full health check
```

---

## Troubleshooting

### Deployment Failed
```bash
# Check GitHub Actions
gh run list --repo speudoname/twu-app
gh run view [RUN_ID] --log

# Check server
ssh root@104.236.100.157 "pm2 logs twu"
```

### Database Out of Sync
```bash
# Get latest from production
/sync-db download

# Or manually
./scripts/db-download.sh
```

### Server Not Responding
```bash
# Check status
ssh root@104.236.100.157 "pm2 status"

# Restart if needed
ssh root@104.236.100.157 "pm2 restart twu"
```

### Local Dev Not Working
```bash
# Backend (from /backend)
npm install
npm run dev

# Frontend (from /frontend)
npm install
npm run dev
```

---

## For Advanced Users

### Direct Script Access
All slash commands use these scripts under the hood:

```bash
# Deployment
./scripts/deploy.sh v1.0.3 "Description"    # Full deploy
./scripts/db-upload.sh                      # Upload DB only
./scripts/db-download.sh                    # Download DB only

# Monitoring
./scripts/pm2-status.sh                     # Server status
./scripts/pm2-logs.sh                       # View logs
./scripts/server-health.sh                  # Health check
```

### Manual Deployment (Step by Step)
```bash
./scripts/db-upload.sh                      # 1. Upload database
git add .                                   # 2. Stage changes
git commit -m "Your changes"                # 3. Commit
git push origin main                        # 4. Push to GitHub
git tag v1.0.3                              # 5. Create release tag
git push origin v1.0.3                      # 6. Push tag (triggers deploy)
```

### Slash Command Details
See `.claude/commands/README.md` for detailed documentation on each command.

---

## Backups

**Automatic backups created on every sync:**
- Local: `backend/data/twu.db.backup.YYYYMMDD_HHMMSS`
- Production: `/var/www/twu/backend/data/twu.db.backup.YYYYMMDD_HHMMSS`

**List backups:**
```bash
ls -lh backend/data/*.backup*
ssh root@104.236.100.157 'ls -lh /var/www/twu/backend/data/*.backup*'
```

**Restore from backup:**
```bash
cp backend/data/twu.db.backup.20250113_095000 backend/data/twu.db
```

---

## What Gets Deployed

**Automatic (via release tag):**
- ✅ Code changes
- ✅ Dependencies (npm packages)
- ✅ Frontend build
- ✅ Backend restart

**Manual (via scripts):**
- ⚠️ Database (`twu.db` file)

**Never deployed:**
- ❌ `node_modules/` (installed fresh)
- ❌ `.env` files (set on server)
- ❌ Local config files
- ❌ Development files

---

## File Structure

```
twu/
├── backend/               # Express API server
│   ├── data/             # SQLite database
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic (OpenAI, etc)
│   └── server.js         # Entry point
├── frontend/             # React PWA
│   ├── src/              # React components
│   ├── public/           # PWA assets (manifest, icons, SW)
│   └── index.html        # Entry point
├── scripts/              # Deployment & monitoring scripts
├── .github/workflows/    # GitHub Actions (auto-deploy)
└── .claude/commands/     # Slash commands for Claude Code
```

---

## Environment Variables

**Backend (.env):**
```
DATABASE_PATH=./data/twu.db
PORT=3001
JWT_SECRET=your-secret-here
OPENAI_API_KEY=your-key-here
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3001
```

**Production (set on server):**
Same variables, different values (production URLs/keys).

---

## Version History

- **v1.0.0-pwa** - Initial PWA release with Apple liquid glass design
- See GitHub releases: https://github.com/speudoname/twu-app/releases

---

**For detailed command documentation, see:**
- `.claude/commands/README.md` - Slash commands reference
- `scripts/` directory - Direct script usage
