#!/bin/bash

# Restart PM2 process on DigitalOcean droplet

DROPLET_IP="104.236.100.157"
DROPLET_USER="root"

echo "🔄 Restarting TWU application on DigitalOcean..."

ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
    cd /var/www/twu/backend
    pm2 restart twu
    echo ""
    echo "✅ Application restarted successfully!"
    echo ""
    pm2 list
EOF