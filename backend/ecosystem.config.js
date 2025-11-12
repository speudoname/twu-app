module.exports = {
  apps: [{
    name: 'twu',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,

    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',

    // Performance
    max_memory_restart: '500M',

    // Auto-restart on crash
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000
  }]
};