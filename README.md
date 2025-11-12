# TWU - Time Well Used

A task management application with user authentication, email verification, and admin panel.

## Features

- User authentication (register, login, password reset)
- Email verification using Postmark
- Task management (CRUD operations)
- Admin panel for email configuration
- SQLite database
- JWT-based authentication
- Responsive design

## Tech Stack

**Backend:**
- Node.js + Express
- SQLite (better-sqlite3)
- JWT authentication
- Postmark for emails
- bcrypt for password hashing

**Frontend:**
- React 18
- Vite
- React Router v6
- Axios for API calls

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd twu
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Initialize the database:
```bash
npm run init
```
This creates the database with tables and the admin user.

4. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Development

1. Start the backend server (port 3000):
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend (port 3001):
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3001
```

### Default Admin User

- **Email:** levan@sarke.ge
- **Password:** levan0488

Use these credentials to access the admin panel at `/admin/settings`.

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DATABASE_PATH=./data/twu.db

# Frontend URL (for email links)
FRONTEND_URL=https://104-236-100-157.nip.io
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email/:token` - Verify email address

### Tasks (Protected)
- `GET /api/tasks` - Get all tasks for logged-in user
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/toggle` - Toggle task completion
- `DELETE /api/tasks/:id` - Delete task

### Admin (Protected - Admin only)
- `GET /api/admin/settings` - Get email settings
- `PUT /api/admin/settings` - Update email settings
- `POST /api/admin/test-email` - Send test email
- `GET /api/admin/stats` - Get platform statistics
- `GET /api/admin/users` - Get all users

## Email Configuration

1. Login as admin
2. Navigate to Admin Settings (`/admin/settings`)
3. Configure Postmark:
   - Add your Postmark Server API Token
   - Set sender email and name
   - Save settings
4. Test the configuration using the "Send Test Email" feature

## Database Management

### Reset Database
To completely reset the database (drops all tables and recreates with admin user):
```bash
cd backend
npm run reset
```

### Backup Database
The SQLite database is located at:
```
backend/data/twu.db
```
Simply copy this file to create a backup.

## Deployment

### Production Build

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. The built files will be in `frontend/build/`

3. Configure the backend to serve static files in production mode

### Deployment to DigitalOcean Droplet

1. SSH into the droplet:
```bash
ssh root@104.236.100.157
```

2. Clone and setup the application
3. Use PM2 to manage the Node.js process
4. Configure Nginx as reverse proxy

## Project Structure

```
twu/
├── backend/
│   ├── data/           # SQLite database
│   ├── database/       # DB schema and seeds
│   ├── middleware/     # Auth middleware
│   ├── routes/         # API routes
│   ├── services/       # Email service
│   └── server.js       # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── contexts/   # Auth context
│   │   ├── pages/      # Page components
│   │   ├── services/   # API service
│   │   └── App.jsx     # Main app component
│   └── index.html
└── PROJECT_SPEC.md     # Detailed specifications
```

## Testing

### Manual Testing Checklist

- [ ] User can register with email/password
- [ ] User receives verification email (if Postmark configured)
- [ ] User can login with credentials
- [ ] User can create, update, delete tasks
- [ ] User can mark tasks as complete/incomplete
- [ ] User can reset password
- [ ] Admin can access admin panel
- [ ] Admin can configure email settings
- [ ] Admin can send test emails

## Troubleshooting

### Port Already in Use
If port 3000 or 3001 is already in use:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Issues
If you encounter database errors, try resetting:
```bash
cd backend
npm run reset
```

### Email Not Sending
1. Check Postmark configuration in admin panel
2. Verify API token is correct
3. Check sender email is verified in Postmark
4. Use "Send Test Email" feature to debug

## Security Considerations

- Change JWT_SECRET in production
- Use HTTPS in production
- Keep dependencies updated
- Validate all user inputs
- Use environment variables for sensitive data
- Enable email verification in production

## License

ISC

## Support

For issues or questions, please check the PROJECT_SPEC.md file for detailed documentation.