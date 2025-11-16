---
description: Check TWU deployment and server status
---

Check the status of TWU application across all systems.

Run the following commands and show the results:

1. **Git Status:**
```bash
git status --short
git log -1 --oneline
```

2. **Latest GitHub Actions Deployment:**
```bash
gh run list --repo speudoname/twu-app --limit 1
```

3. **PM2 Server Status:**
```bash
./scripts/pm2-status.sh
```

4. **Database Info:**
```bash
ls -lh backend/data/twu.db
ssh root@104.236.100.157 "ls -lh /var/www/twu/backend/data/twu.db"
```

Present the results in a clean summary showing:
- Local changes (if any)
- Latest deployment status
- Server health
- Database sync status (compare local vs remote timestamps)

Also show quick links:
- GitHub Actions: https://github.com/speudoname/twu-app/actions
- PM2 Dashboard: https://app.pm2.io/#/r/irlgcqwelh1fzzl
- Production URL: https://104-236-100-157.nip.io
