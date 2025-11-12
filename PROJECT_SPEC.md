# TWU (Time Well Used) - Project Specification

## Project Overview

**Name:** TWU - Time Well Used
**Type:** Task Management Application
**Platforms:** Web App + React Native Mobile App (future)
**Infrastructure:** DigitalOcean Droplet (self-hosted)

---

## Current Infrastructure

### DigitalOcean Droplet
- **IP Address:** `104.236.100.157`
- **OS:** Ubuntu 22.04
- **Plan:** $6/month (1GB RAM, 1 vCPU, 25GB SSD)
- **SSH Access:** Key-based authentication (no password)
- **Domain:** `https://104-236-100-157.nip.io` (nip.io magic DNS with SSL)

### Services Already Configured
- ✅ **Nginx:** Reverse proxy + SSL termination
- ✅ **Let's Encrypt SSL:** Auto-renewal configured
- ✅ **PM2:** Process manager installed
- ✅ **Firewall (UFW):** Configured (ports 22, 80, 443 open)
- ✅ **Git:** Installed and configured

### SSH Connection
```bash
ssh root@104.236.100.157
```

---

## Project Architecture

### Technology Stack

**Backend:**
- Node.js with Express
- SQLite database (file-based, on droplet)
- JWT for authentication
- bcrypt for password hashing
- Postmark for email sending

**Frontend:**
- React (or Next.js)
- Fetch API for backend communication
- Simple, clean UI

**Mobile (Future):**
- React Native
- Same backend API

### System Architecture

```
Droplet ($6/month):
├── Nginx (port 80/443)
│   ├── Serves static web app files
│   └── Proxies /api/* to Node.js backend
├── Node.js Backend API (port 3000)
│   ├── Authentication endpoints
│   ├── Task management endpoints
│   └── Admin endpoints
└── SQLite Database (data/twu.db)
    └── All data stored locally on droplet

Mobile App (Future):
└── Connects to same API via HTTPS
```

---

## Database Schema

### Tables

#### 1. users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_verified INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. tasks
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 3. email_tokens (for email verification)
```sql
CREATE TABLE email_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 4. reset_tokens (for password reset)
```sql
CREATE TABLE reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 5. email_settings (admin configurable)
```sql
CREATE TABLE email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  postmark_server_token TEXT,
  postmark_stream TEXT DEFAULT 'outbound',
  sender_email TEXT,
  sender_name TEXT,
  reply_to_email TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1)  -- Only one row allowed
);
```

---

## API Endpoints

### Authentication

#### POST /api/auth/register
Register new user
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### POST /api/auth/login
Login user
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "is_admin": 0
  }
}
```

#### POST /api/auth/logout
Logout user (invalidate token)

#### POST /api/auth/forgot-password
Request password reset
```json
Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST /api/auth/reset-password
Reset password with token
```json
Request:
{
  "token": "reset-token",
  "password": "newpassword123"
}

Response:
{
  "success": true,
  "message": "Password reset successful"
}
```

#### GET /api/auth/verify-email/:token
Verify email address

---

### Tasks (Protected - requires authentication)

#### GET /api/tasks
Get all tasks for logged-in user
```json
Headers:
Authorization: Bearer <jwt-token>

Response:
{
  "tasks": [
    {
      "id": 1,
      "title": "Complete project",
      "description": "Finish TWU app",
      "completed": 0,
      "created_at": "2025-01-12T10:00:00Z"
    }
  ]
}
```

#### POST /api/tasks
Create new task
```json
Headers:
Authorization: Bearer <jwt-token>

Request:
{
  "title": "New task",
  "description": "Task description"
}

Response:
{
  "success": true,
  "task": {
    "id": 1,
    "title": "New task",
    "description": "Task description",
    "completed": 0
  }
}
```

#### PUT /api/tasks/:id
Update task

#### DELETE /api/tasks/:id
Delete task

---

### Admin (Protected - requires admin role)

#### GET /api/admin/settings
Get email settings
```json
Headers:
Authorization: Bearer <jwt-token>

Response:
{
  "settings": {
    "postmark_server_token": "pm-xxx",
    "postmark_stream": "outbound",
    "sender_email": "noreply@twu.com",
    "sender_name": "TWU",
    "reply_to_email": "support@twu.com"
  }
}
```

#### PUT /api/admin/settings
Update email settings
```json
Headers:
Authorization: Bearer <jwt-token>

Request:
{
  "postmark_server_token": "pm-xxx",
  "postmark_stream": "outbound",
  "sender_email": "noreply@twu.com",
  "sender_name": "TWU",
  "reply_to_email": "support@twu.com"
}

Response:
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## Initial Admin User

**Email:** `levan@sarke.ge`
**Password:** `levan0488`
**Role:** Admin (is_admin = 1)

This user should be created automatically on first database initialization.

---

## Email Integration (Postmark)

### Configuration
Email settings will be stored in the `email_settings` table and configured via the admin panel.

**Required fields:**
- Postmark Server API Token (e.g., `pm-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Stream name (default: `outbound`)
- Sender email (e.g., `noreply@domain.com`)
- Sender name (e.g., `TWU`)
- Reply-to email (optional)

### Email Templates

**1. Welcome Email (on registration)**
```
Subject: Welcome to TWU!

Hi {{name}},

Welcome to TWU - Time Well Used!

Please verify your email by clicking the link below:
{{verification_link}}

Best regards,
TWU Team
```

**2. Email Verification**
```
Subject: Verify your email

Hi {{name}},

Please verify your email address by clicking the link below:
{{verification_link}}

This link expires in 24 hours.

Best regards,
TWU Team
```

**3. Password Reset**
```
Subject: Reset your password

Hi {{name}},

You requested to reset your password. Click the link below:
{{reset_link}}

This link expires in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
TWU Team
```

---

## Frontend Pages

### Public Pages
1. **Login** (`/login`)
   - Email + password form
   - "Forgot password?" link
   - "Register" link

2. **Register** (`/register`)
   - Email, password, name form
   - "Already have an account? Login" link

3. **Forgot Password** (`/forgot-password`)
   - Email input
   - Submit button

4. **Reset Password** (`/reset-password/:token`)
   - New password input
   - Confirm password input
   - Submit button

### Protected Pages (require login)
1. **Tasks** (`/tasks`)
   - List of tasks
   - Add task button
   - Mark complete/incomplete
   - Delete task
   - Edit task

2. **Admin Panel** (`/admin/settings`) (admin only)
   - Email settings form
   - Save button
   - Test email button

---

## Security Requirements

### Authentication
- Passwords hashed with bcrypt (10 rounds minimum)
- JWT tokens with 7-day expiration
- Tokens stored in localStorage (or httpOnly cookies for production)
- All protected routes verify JWT

### Password Requirements
- Minimum 8 characters
- At least one letter and one number (basic validation)

### Email Verification
- Tokens expire after 24 hours
- One-time use only

### Password Reset
- Tokens expire after 1 hour
- One-time use only
- Old password invalid after reset

### Admin Routes
- Check `is_admin = 1` in JWT payload
- Return 403 Forbidden if not admin

---

## Project Structure

```
/Users/apple/Desktop/twu/
├── backend/
│   ├── server.js                 # Main Express server
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── tasks.js             # Task CRUD routes
│   │   └── admin.js             # Admin routes
│   ├── middleware/
│   │   ├── auth.js              # JWT verification middleware
│   │   └── adminAuth.js         # Admin-only middleware
│   ├── services/
│   │   └── email.js             # Postmark email service
│   ├── database/
│   │   ├── schema.sql           # Database schema
│   │   ├── db.js                # Database connection
│   │   └── seed.js              # Create initial admin user
│   ├── data/
│   │   └── twu.db               # SQLite database file (gitignored)
│   ├── .env                     # Environment variables (gitignored)
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── Tasks.jsx
│   │   │   └── Admin/
│   │   │       └── Settings.jsx
│   │   ├── components/
│   │   │   ├── TaskItem.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
├── .gitignore
└── README.md
```

---

## Environment Variables (.env)

```bash
# Server
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DATABASE_PATH=./data/twu.db

# Frontend URL (for email links)
FRONTEND_URL=https://104-236-100-157.nip.io

# Email settings are stored in database (not env vars)
```

---

## Deployment Steps

### 1. Local Development Setup
```bash
cd /Users/apple/Desktop/twu/backend
npm install express better-sqlite3 bcrypt jsonwebtoken cors dotenv postmark
npm install --save-dev nodemon

# Initialize database
npm run init

# Start dev server
npm run dev
```

### 2. Deploy to Droplet
```bash
# On local machine
cd /Users/apple/Desktop/twu
git init
git add .
git commit -m "Initial TWU setup"
git remote add origin <your-github-repo>
git push -u origin main

# On droplet
ssh root@104.236.100.157
cd /var/www
git clone <your-github-repo> twu
cd twu/backend
npm install --production
npm run init  # Initialize database with admin user
pm2 start server.js --name twu
pm2 save

# Configure nginx
# (Update nginx config to proxy to new app)
systemctl reload nginx
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name 104-236-100-157.nip.io;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 104-236-100-157.nip.io;

    ssl_certificate /etc/letsencrypt/live/104-236-100-157.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/104-236-100-157.nip.io/privkey.pem;

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
    }
}
```

---

## Testing Checklist

### Authentication Flow
- [ ] User can register with email/password
- [ ] Verification email is sent (after Postmark configured)
- [ ] User can verify email via link
- [ ] User can login with verified email
- [ ] JWT token is returned on login
- [ ] User can logout
- [ ] User can request password reset
- [ ] Password reset email is sent
- [ ] User can reset password with token

### Task Management
- [ ] Logged-in user can create tasks
- [ ] User can view their own tasks
- [ ] User can update tasks
- [ ] User can delete tasks
- [ ] User can mark tasks as complete/incomplete
- [ ] User cannot see other users' tasks

### Admin Panel
- [ ] Admin user can access admin panel
- [ ] Non-admin user gets 403 on admin routes
- [ ] Admin can view email settings
- [ ] Admin can update email settings
- [ ] Email settings are persisted to database
- [ ] Emails use configured settings

---

## Future Enhancements

### Phase 2 (Mobile App)
- React Native app
- Uses same backend API
- Offline support with local SQLite sync
- Push notifications

### Phase 3 (Advanced Features)
- Task categories/tags
- Task priorities
- Due dates and reminders
- Task sharing/collaboration
- Task templates
- Time tracking per task
- Analytics dashboard

---

## Important Notes

1. **Email initially disabled:** Users can register and login, but verification emails won't be sent until Postmark is configured in admin panel.

2. **Password reset without email:** If Postmark not configured, users can still reset password via direct database update (for development).

3. **Single admin:** Only one admin user initially (levan@sarke.ge). Add functionality to promote users to admin later if needed.

4. **Mobile-ready API:** All API endpoints designed to work for both web and mobile apps.

5. **SQLite limitations:** Good for up to 10,000 users. Consider PostgreSQL if app grows beyond that.

---

## Commands Reference

### Development
```bash
# Backend
cd /Users/apple/Desktop/twu/backend
npm run dev

# Frontend
cd /Users/apple/Desktop/twu/frontend
npm start
```

### Database
```bash
# Initialize database (creates tables + admin user)
npm run init

# Reset database (drops all tables and recreates)
npm run reset
```

### Deployment
```bash
# On droplet
ssh root@104.236.100.157
cd /var/www/twu/backend
git pull origin main
npm install --production
pm2 restart twu
```

---

## Support & Documentation

- **DigitalOcean Docs:** https://docs.digitalocean.com
- **Postmark Docs:** https://postmarkapp.com/developer
- **SQLite Docs:** https://www.sqlite.org/docs.html
- **JWT Docs:** https://jwt.io/introduction

---

**Last Updated:** January 12, 2025
**Version:** 1.0
**Status:** Ready to build
