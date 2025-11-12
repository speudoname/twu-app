# TWU - Quick Reference

## Daily Workflow

### Start Your Day
```bash
cd /Users/apple/twu
./scripts/db-download.sh    # Get latest production database
```

### Make Changes
- Edit code
- Test on http://localhost:3001
- Backend runs on http://localhost:3000

### End Your Day
```bash
# If you made database changes
./scripts/db-upload.sh

# Push code changes
git add .
git commit -m "Your changes"
git push origin main

# Deploy to production
./deploy.sh
```

## One-Line Commands

```bash
# Download database from production
./scripts/db-download.sh

# Upload database to production
./scripts/db-upload.sh

# Deploy code to production
./deploy.sh

# Full sync (database + code)
./scripts/db-upload.sh && git push origin main && ./deploy.sh
```

## When to Sync Database

✅ **Download** (start of work):
- Every morning
- Before making changes
- When testing with real data

✅ **Upload** (end of work):
- After adding users
- After admin settings
- After any database changes
- End of day

## URLs

- **Local**: http://localhost:3001
- **Production**: https://104-236-100-157.nip.io
- **GitHub**: https://github.com/speudoname/twu-app

## Admin Login

- **Email**: levan@sarke.ge
- **Password**: levan0488

## Need Help?

See `CLAUDE.md` for detailed workflow and troubleshooting.