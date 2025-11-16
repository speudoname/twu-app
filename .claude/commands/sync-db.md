---
description: Sync database between local and production
---

Sync the TWU database. Ask the user which direction:

**Options:**
1. **Download** - Get production database to local (start of work)
2. **Upload** - Push local database to production (before deploy)

If user specifies direction, run the appropriate script:
- Download: `./scripts/db-download.sh`
- Upload: `./scripts/db-upload.sh`

If user doesn't specify, ask which direction they want.

After syncing, show:
- Database size before and after
- Timestamp of sync
- Reminder about backup location

Example usage:
- `/sync-db download` - Get production data
- `/sync-db upload` - Push local changes to production
