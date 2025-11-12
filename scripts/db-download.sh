#!/bin/bash

# Download database from DigitalOcean to local
# Use this at the START of your work session

DROPLET_IP="104.236.100.157"
DROPLET_USER="root"
REMOTE_DB="/var/www/twu/backend/data/twu.db"
LOCAL_DB="/Users/apple/twu/backend/data/twu.db"

echo "📥 Downloading database from DigitalOcean..."

# Create backup of local db if it exists
if [ -f "$LOCAL_DB" ]; then
    BACKUP_FILE="${LOCAL_DB}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Backing up local database to: $BACKUP_FILE"
    cp "$LOCAL_DB" "$BACKUP_FILE"
fi

# Download database from droplet
scp $DROPLET_USER@$DROPLET_IP:$REMOTE_DB $LOCAL_DB

if [ $? -eq 0 ]; then
    echo "✅ Database downloaded successfully!"
    echo "Local database updated at: $LOCAL_DB"
else
    echo "❌ Failed to download database"
    exit 1
fi