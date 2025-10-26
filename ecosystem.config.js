module.exports = {
  apps: [{
    name: 'nts-server',
    script: 'server.js',
    instances: 1, // Для початку 1 інстанс, можна збільшити для кластера
    exec_mode: 'fork', // Використовуємо fork для SQLite
    watch: false, // Не слідкуємо за змінами файлів в production
    max_memory_restart: '512M', // Перезапуск при перевищенні пам'яті
    env: {
      NODE_ENV: 'development',
      PORT: 8000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000,
      JWT_SECRET: process.env.JWT_SECRET || 'your_super_secure_jwt_secret_key'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Автоматичний перезапуск при збоях
    autorestart: true,
    // Максимальна кількість перезапусків
    max_restarts: 10,
    // Час між перезапусками
    min_uptime: '10s',
    // Налаштування для Windows
    windowsHide: true,
    // Graceful shutdown
    kill_timeout: 5000,
    // Health check
    health_check_grace_period: 3000,
    // Ignore watching files
    ignore_watch: [
      'node_modules',
      'logs',
      'backups',
      '*.log'
    ]
  }]
};

