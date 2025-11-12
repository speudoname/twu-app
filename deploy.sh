#!/bin/bash

# TWU Deployment Script
# This script deploys the application to DigitalOcean droplet

DROPLET_IP="104.236.100.157"
DROPLET_USER="root"
APP_DIR="/var/www/twu"

echo "🚀 Starting deployment to DigitalOcean..."

# SSH into droplet and execute deployment commands
ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
    echo "📦 Navigating to application directory..."
    cd /var/www/twu

    echo "📥 Pulling latest changes from GitHub..."
    git pull origin main

    echo "🔧 Installing backend dependencies..."
    cd backend
    npm install --production

    echo "🔧 Installing frontend dependencies and building..."
    cd ../frontend
    npm install
    npm run build

    echo "🔄 Restarting backend with PM2..."
    cd ../backend
    pm2 restart twu || pm2 start server.js --name twu

    echo "💾 Saving PM2 configuration..."
    pm2 save

    echo "✅ Deployment complete!"
ENDSSH

echo "🎉 Deployment finished successfully!"