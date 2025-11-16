---
description: Deploy TWU to production with database sync, git commit, and release tag
---

Deploy the TWU application to production. This command:
1. Uploads the database to production
2. Commits all changes to Git
3. Pushes to GitHub
4. Creates and pushes a release tag (triggers auto-deployment)

Execute the deployment script with the provided version and description.

If the user provides a version tag and description, run:
```bash
./scripts/deploy.sh <version> "<description>"
```

If the user only provides a version tag, ask for a description first.

If the user doesn't provide a version tag, suggest the next version based on the latest git tag.

After running the script, show the deployment status and remind the user they can monitor:
- GitHub Actions: https://github.com/speudoname/twu-app/actions
- PM2 Dashboard: https://app.pm2.io/#/r/irlgcqwelh1fzzl

Example usage:
- `/deploy v1.0.3 "Add inbox voice transcription"`
- `/deploy v1.1.0 "Major UI redesign with PWA"`
