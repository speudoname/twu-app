#!/bin/bash

# DigitalOcean Droplet Initial Setup Script
# Run this script on the droplet after cloning the repository

echo "🚀 Starting TWU application setup on DigitalOcean..."

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js (if not already installed)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally (if not already installed)
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Install Nginx (if not already installed)
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt install -y nginx
fi

# Create application directory
echo "📁 Setting up application directory..."
mkdir -p /var/www/twu

# Set up PM2 to start on boot
echo "⚙️ Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root

# Create Nginx configuration
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/twu << 'EOF'
server {
    listen 80;
    server_name 104-236-100-157.nip.io;

    # Redirect to HTTPS if SSL is configured
    # return 301 https://$server_name$request_uri;

    # Serve frontend static files
    location / {
        root /var/www/twu/frontend/build;
        try_files $uri /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/twu /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Droplet setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your GitHub repository: git clone <your-repo-url> /var/www/twu"
echo "2. Copy .env.production.example to .env and configure"
echo "3. Install dependencies: cd backend && npm install"
echo "4. Initialize database: npm run init"
echo "5. Build frontend: cd ../frontend && npm install && npm run build"
echo "6. Start backend with PM2: cd ../backend && pm2 start server.js --name twu"
echo "7. Save PM2 configuration: pm2 save"