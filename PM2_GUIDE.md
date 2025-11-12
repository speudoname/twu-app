# PM2 Process Manager Guide

## What is PM2?

PM2 is a production process manager for Node.js applications. It keeps your app running, restarts it if it crashes, and provides monitoring tools.

## Quick Access Scripts

We've created simple scripts to manage PM2 remotely:

```bash
# Check PM2 status and detailed info
./scripts/pm2-status.sh

# View application logs (last 50 lines by default)
./scripts/pm2-logs.sh

# View specific number of lines
./scripts/pm2-logs.sh 100

# Restart the application
./scripts/pm2-restart.sh

# Complete server health check
./scripts/server-health.sh
```

## Direct PM2 Commands

If you want to SSH into the droplet and use PM2 directly:

```bash
# SSH into droplet
ssh root@104.236.100.157

# Then run PM2 commands:
```

### Basic Commands

```bash
# List all processes
pm2 list

# Show detailed info about TWU app
pm2 show twu

# View logs (live stream)
pm2 logs twu

# View logs (last 100 lines)
pm2 logs twu --lines 100

# Restart application
pm2 restart twu

# Stop application
pm2 stop twu

# Start application
pm2 start twu

# Delete process from PM2
pm2 delete twu
```

### Monitoring Commands

```bash
# Real-time monitoring dashboard
pm2 monit

# Get metrics
pm2 describe twu

# View error logs only
pm2 logs twu --err

# View output logs only
pm2 logs twu --out

# Flush logs (clear old logs)
pm2 flush

# Save current PM2 configuration
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### Advanced Commands

```bash
# Restart with new ecosystem config
pm2 restart ecosystem.config.js

# Reload (zero-downtime restart)
pm2 reload twu

# Stop and restart
pm2 restart twu --update-env

# Set max memory before restart
pm2 start server.js --max-memory-restart 300M

# Check PM2 status
pm2 status

# Get PM2 info
pm2 info twu
```

## PM2 Configuration

The app uses an ecosystem file at `/var/www/twu/backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'twu',
    script: './server.js',

    // Auto-restart on crash
    autorestart: true,
    max_restarts: 10,

    // Restart if memory exceeds 500MB
    max_memory_restart: '500M',

    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## Log Files Location

On the droplet, logs are stored in:

```bash
# PM2 logs
/root/.pm2/logs/twu-error.log    # Error logs
/root/.pm2/logs/twu-out.log      # Output logs

# Application logs (if configured)
/var/www/twu/backend/logs/error.log
/var/www/twu/backend/logs/out.log
/var/www/twu/backend/logs/combined.log
```

View logs directly:
```bash
ssh root@104.236.100.157
tail -f /root/.pm2/logs/twu-out.log
tail -f /root/.pm2/logs/twu-error.log
```

## Common PM2 Tasks

### Task 1: Application Crashed - Restart It
```bash
./scripts/pm2-restart.sh
```

### Task 2: Check if Application is Running
```bash
./scripts/pm2-status.sh
```

### Task 3: View Recent Errors
```bash
./scripts/pm2-logs.sh 50
# Or SSH and view errors only:
ssh root@104.236.100.157 "pm2 logs twu --err --lines 50"
```

### Task 4: Check Server Performance
```bash
./scripts/server-health.sh
```

### Task 5: Clear Old Logs
```bash
ssh root@104.236.100.157 "pm2 flush"
```

### Task 6: Update Application After Code Changes
```bash
# This is done automatically with deployment
git tag v1.0.2
git push origin v1.0.2

# Or manually:
ssh root@104.236.100.157 "cd /var/www/twu/backend && pm2 restart twu"
```

## PM2 Startup on Boot

PM2 is configured to start automatically when the server reboots:

```bash
# Check startup configuration
ssh root@104.236.100.157 "pm2 startup"

# Save current processes to startup
ssh root@104.236.100.157 "pm2 save"
```

## Monitoring & Alerts

### Real-time Monitoring
```bash
# SSH into droplet
ssh root@104.236.100.157

# Start monitoring dashboard
pm2 monit
```

### Check Application Health
```bash
# From local machine
./scripts/server-health.sh

# Or check API directly
curl https://104-236-100-157.nip.io/api/health
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs for errors
./scripts/pm2-logs.sh 100

# Check if port 3000 is available
ssh root@104.236.100.157 "netstat -tulpn | grep 3000"

# Try stopping and starting
ssh root@104.236.100.157 "pm2 stop twu && pm2 start /var/www/twu/backend/server.js --name twu"
```

### High Memory Usage

```bash
# Check current memory
ssh root@104.236.100.157 "pm2 describe twu | grep memory"

# Restart to free memory
./scripts/pm2-restart.sh
```

### Application Keeps Restarting

```bash
# Check restart count
./scripts/pm2-status.sh

# View error logs
ssh root@104.236.100.157 "pm2 logs twu --err --lines 100"

# Common causes:
# - Syntax error in code
# - Missing dependencies
# - Port already in use
# - Database connection failed
```

### Can't Connect to Application

```bash
# Check if PM2 process is running
./scripts/pm2-status.sh

# Check if Nginx is running
ssh root@104.236.100.157 "systemctl status nginx"

# Check if backend is responding
ssh root@104.236.100.157 "curl http://localhost:3000/api/health"
```

## Best Practices

1. **Always save after changes**
   ```bash
   pm2 save
   ```

2. **Use reload for zero-downtime**
   ```bash
   pm2 reload twu  # Instead of restart
   ```

3. **Monitor logs regularly**
   ```bash
   ./scripts/pm2-logs.sh
   ```

4. **Check health periodically**
   ```bash
   ./scripts/server-health.sh
   ```

5. **Keep PM2 updated**
   ```bash
   ssh root@104.236.100.157 "npm install -g pm2@latest && pm2 update"
   ```

## PM2 Web Dashboard (Optional)

PM2 offers a web dashboard called PM2 Plus (formerly Keymetrics):

```bash
# Connect to PM2 Plus
ssh root@104.236.100.157 "pm2 link <secret-key> <public-key>"
```

Visit https://pm2.io to create an account and get keys.

## Quick Reference Card

| Task | Command |
|------|---------|
| View status | `./scripts/pm2-status.sh` |
| View logs | `./scripts/pm2-logs.sh` |
| Restart app | `./scripts/pm2-restart.sh` |
| Health check | `./scripts/server-health.sh` |
| SSH to server | `ssh root@104.236.100.157` |
| Live logs | `ssh root@104.236.100.157 "pm2 logs twu"` |
| Stop app | `ssh root@104.236.100.157 "pm2 stop twu"` |
| Start app | `ssh root@104.236.100.157 "pm2 start twu"` |

## Additional Resources

- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- PM2 Cheatsheet: https://devhints.io/pm2
- PM2 GitHub: https://github.com/Unitech/pm2