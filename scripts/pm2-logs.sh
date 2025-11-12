#!/bin/bash

# View PM2 logs from DigitalOcean droplet

DROPLET_IP="104.236.100.157"
DROPLET_USER="root"

# Default to last 50 lines, or use argument
LINES=${1:-50}

echo "📋 Viewing last $LINES lines of PM2 logs..."
echo ""

ssh $DROPLET_USER@$DROPLET_IP "pm2 logs twu --lines $LINES --nostream"