#!/bin/bash

# Upload database from local to DigitalOcean
# Use this at the END of your work session or after making changes

DROPLET_IP="104.236.100.157"
DROPLET_USER="root"
REMOTE_DB="/var/www/twu/backend/data/twu.db"
LOCAL_DB="/Users/apple/twu/backend/data/twu.db"

echo "📤 Uploading database to DigitalOcean..."

# Check if local database exists
if [ ! -f "$LOCAL_DB" ]; then
    echo "❌ Local database not found at: $LOCAL_DB"
    exit 1
fi

# Create backup on droplet before uploading
echo "📦 Creating backup on droplet..."
ssh $DROPLET_USER@$DROPLET_IP "cp $REMOTE_DB ${REMOTE_DB}.backup.\$(date +%Y%m%d_%H%M%S)"

# Upload database to droplet
scp $LOCAL_DB $DROPLET_USER@$DROPLET_IP:$REMOTE_DB

if [ $? -eq 0 ]; then
    echo "✅ Database uploaded successfully!"
    echo "Production database updated"

    # Restart backend to ensure it picks up changes
    echo "🔄 Restarting backend service..."
    ssh $DROPLET_USER@$DROPLET_IP "cd /var/www/twu/backend && pm2 restart twu"
    echo "✅ Backend restarted"
else
    echo "❌ Failed to upload database"
    exit 1
fi