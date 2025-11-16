# TWU Slash Commands

Quick reference for Claude Code slash commands available in this project.

## Available Commands

### `/deploy v1.0.2 "Description"`
Deploy TWU to production with one command:
- Uploads database to production
- Commits all changes to Git
- Pushes to GitHub
- Creates release tag (triggers auto-deployment)
- Shows deployment status

**Example:**
```
/deploy v1.0.3 "Add voice transcription to inbox"
```

---

### `/status`
Check TWU system status across all platforms:
- Local git status
- Latest deployment on GitHub Actions
- PM2 server health
- Database sync status
- Quick links to monitoring dashboards

**Example:**
```
/status
```

---

### `/sync-db [direction]`
Sync database between local and production:
- `download` - Get production database to local (start of work)
- `upload` - Push local database to production (before deploy)

**Examples:**
```
/sync-db download
/sync-db upload
```

---

## Tips

- Use `/deploy` for complete deployments (code + database)
- Use `/status` to check if everything is healthy
- Use `/sync-db download` at the start of each work session
- All commands include helpful prompts and validation

## Direct Script Access

If you prefer to run scripts directly:
```bash
./scripts/deploy.sh v1.0.2 "Description"
./scripts/pm2-status.sh
./scripts/db-download.sh
```

See `CLAUDE.md` for complete documentation.
