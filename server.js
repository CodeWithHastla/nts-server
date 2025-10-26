// server.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();

// --- Налаштування часового поясу ---
process.env.TZ = 'Europe/Warsaw';

// --- Функція форматування дати для Польщі ---
function formatDateTimeForPoland(dateString) {
  if (!dateString) return 'Не вказано';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

// --- Функція форматування дати (тільки дата) для Польщі ---
function formatDateForPoland(dateString) {
  if (!dateString) return 'Не вказано';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

// --- Функція логування ---
function logSystemEvent(level, message, user = null, ip = null) {
  db.run(
    'INSERT INTO system_logs (level, message, user, ip) VALUES (?, ?, ?, ?)',
    [level, message, user, ip],
    (err) => {
      if (err) {
        console.error('Logging error:', err);
      }
    }
  );
}

<<<<<<< HEAD
=======
// --- Функція отримання геолокації по IP ---
async function getIPLocation(ip) {
  try {
    // Використовуємо безкоштовний API ipapi.co
    const response = await fetch(`http://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        timezone: data.timezone || 'Unknown'
      };
    }
  } catch (error) {
    console.error('Error fetching IP location:', error);
  }
  
  // Fallback дані
  return {
    country: 'Unknown',
    city: 'Unknown', 
    region: 'Unknown',
    timezone: 'Unknown'
  };
}

// --- Функція перевірки IP адреси ---
async function checkIPAccess(ip, req) {
  try {
    // Перевіряємо чи IP заблокований
    const blockedIP = await new Promise((resolve) => {
      db.get('SELECT * FROM blocked_ips WHERE ip_address = ? AND is_active = 1', [ip], (err, row) => {
        if (err) {
          console.error('Error checking blocked IP:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
    
    if (blockedIP) {
      logSystemEvent('warn', `Blocked IP attempt: ${ip}`, null, ip);
      return { allowed: false, reason: 'IP заблокований' };
    }
    
    // Перевіряємо чи IP в списку дозволених (якщо є обмеження)
    const allowedIPs = await new Promise((resolve) => {
      db.all('SELECT * FROM allowed_ips WHERE is_active = 1', [], (err, rows) => {
        if (err) {
          console.error('Error checking allowed IPs:', err);
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    });
    
    // Якщо є список дозволених IP, перевіряємо чи поточний IP в ньому
    if (allowedIPs.length > 0) {
      const isAllowed = allowedIPs.some(allowedIP => allowedIP.ip_address === ip);
      if (!isAllowed) {
        logSystemEvent('warn', `Unauthorized IP attempt: ${ip}`, null, ip);
        return { allowed: false, reason: 'IP не в списку дозволених' };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking IP access:', error);
    return { allowed: true }; // У разі помилки дозволяємо доступ
  }
}

// Middleware для логування запитів
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Middleware для перевірки IP адреси
app.use(async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Перевіряємо доступ IP
  const ipCheck = await checkIPAccess(ip, req);
  if (!ipCheck.allowed) {
    return res.status(403).json({ 
      message: 'Доступ заборонено', 
      reason: ipCheck.reason,
      ip: ip 
    });
  }
  
  // Додаємо інформацію про IP до запиту
  req.ipInfo = {
    ip: ip,
    userAgent: req.get('User-Agent') || 'Unknown'
  };
  
  next();
});

// Middleware для обробки помилок
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

app.use(express.json());
app.use(cors());

app.use(express.static('public'));

const PORT = process.env.PORT || 8000;
const PORT = process.env.PORT || 8000;
>>>>>>> 3a26729 (Update NTS Server)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this_in_production';
// --- Валідація вхідних даних ---
function validateUserInput(username, password) {
  const errors = [];
  
  if (!username || typeof username !== 'string') {
    errors.push('Username is required and must be a string');
  } else if (username.length < 3 || username.length > 20) {
    errors.push('Username must be between 3 and 20 characters');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 5) {
    errors.push('Password must be at least 5 characters long');
  }
  
  return errors;
}

// middleware для перевірки токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  // Перевірка, чи токен не відкликаний
  db.get('SELECT * FROM revoked_tokens WHERE token = ?', [token], (err, row) => {
    if (err) {
      console.error('Database error in token verification:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (row) {
      console.log('Authentication failed: Token revoked');
      return res.status(403).json({ message: 'Token has been revoked' });
    }

    try {
      const user = jwt.verify(token, JWT_SECRET);
      
      // Оновлюємо час останньої активності
      db.run(`
        UPDATE active_sessions 
        SET last_activity = datetime('now') 
        WHERE token = ? AND is_active = 1
      `, [token], (err) => {
        if (err) {
          console.error('Error updating session activity:', err);
        }
      });
      
      req.user = user;
      console.log(`User authenticated: ${user.username}`);
      next();
    } catch (jwtError) {
      console.log('Authentication failed: Invalid token', jwtError.message);
      res.status(403).json({ message: 'Invalid or expired token' });
    }
  });
}

// middleware для перевірки, що користувач - Admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    console.log(`Admin access denied for user: unknown`);
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  // Перевіряємо права адміністратора в базі даних
  db.get('SELECT is_admin FROM users WHERE username = ?', [req.user.username], (err, row) => {
    if (err) {
      console.error('Database error in requireAdmin:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (!row || !row.is_admin) {
      console.log(`Admin access denied for user: ${req.user.username}`);
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    console.log(`Admin access granted for user: ${req.user.username}`);
    next();
  });
}


// --- Ініціалізація бази даних SQLite ---
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Обробка помилок бази даних
db.on('error', (err) => {
  console.error('Database error:', err);
  // Не завершуємо процес при помилках бази даних
  // process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

// Обробка необроблених помилок
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Не завершуємо процес, просто логуємо помилку
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Не завершуємо процес, просто логуємо помилку
});

// --- Створюємо таблиці (якщо ще нема) ---
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    tag TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Додаємо нові колонки до існуючої таблиці (якщо вони не існують)
db.run(`ALTER TABLE users ADD COLUMN tag TEXT DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
=======
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_admin INTEGER DEFAULT 0
  )
`, (err) => {
  if (err) {
    console.error('Error creating users table:', err);
  } else {
    console.log('✅ Users table ready');
  }
});

// Додаємо нові колонки до існуючої таблиці (якщо вони не існують)
db.run(`ALTER TABLE users ADD COLUMN tag TEXT DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column name') && !err.message.includes('no such table')) {
>>>>>>> 3a26729 (Update NTS Server)
    console.error('Error adding tag column:', err);
  }
});

db.run(`ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT NULL`, (err) => {
<<<<<<< HEAD
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding created_at column:', err);
  } else {
=======
  if (err && !err.message.includes('duplicate column name') && !err.message.includes('no such table')) {
    console.error('Error adding created_at column:', err);
  } else if (!err) {
>>>>>>> 3a26729 (Update NTS Server)
    // Оновлюємо існуючі записи з поточною датою
    db.run(`UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL`, (err) => {
      if (err) {
        console.error('Error updating created_at values:', err);
      }
    });
  }
});

db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`, (err) => {
<<<<<<< HEAD
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding is_admin column:', err);
  } else {
=======
  if (err && !err.message.includes('duplicate column name') && !err.message.includes('no such table')) {
    console.error('Error adding is_admin column:', err);
  } else if (!err) {
>>>>>>> 3a26729 (Update NTS Server)
    // Встановлюємо Admin користувача як адміна
    db.run(`UPDATE users SET is_admin = 1 WHERE username = 'Admin'`, (err) => {
      if (err) {
        console.error('Error updating Admin user is_admin:', err);
      } else {
        console.log('✅ Admin user is_admin set to 1');
      }
    });
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS revoked_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE,
    revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Таблиця для логів системи
db.run(`
  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    user TEXT,
    ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Таблиця для відстеження активних сесій
db.run(`
  CREATE TABLE IF NOT EXISTS active_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    token TEXT NOT NULL,
    ip TEXT,
<<<<<<< HEAD
=======
    country TEXT,
    city TEXT,
    region TEXT,
    timezone TEXT,
    user_agent TEXT,
>>>>>>> 3a26729 (Update NTS Server)
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
  )
`);

<<<<<<< HEAD
=======
// Таблиця для дозволених IP адрес
db.run(`
  CREATE TABLE IF NOT EXISTS allowed_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT UNIQUE NOT NULL,
    country TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
  )
`);

// Таблиця для блокування IP адрес
db.run(`
  CREATE TABLE IF NOT EXISTS blocked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT UNIQUE NOT NULL,
    reason TEXT,
    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    blocked_by TEXT,
    is_active BOOLEAN DEFAULT 1
  )
`);

>>>>>>> 3a26729 (Update NTS Server)
// --- Додаємо користувача Admin, якщо його ще немає ---
const adminUser = 'Admin';
const adminPass = 'Admin';

bcrypt.hash(adminPass, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing admin password:', err);
    return;
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [adminUser], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }
    
    if (!row) {
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [adminUser, hash], function(err) {
        if (err) {
          console.error('Error creating admin user:', err);
        } else {
          console.log('👤 Admin user created successfully');
        }
      });
    } else {
      console.log('👤 Admin user already exists');
    }
  });
});

// --- Автоматичне очищення старих сесій при запуску ---
db.run(`
  UPDATE active_sessions 
  SET is_active = 0 
  WHERE datetime('now', '-24 hours') > last_activity AND is_active = 1
`, [], function(err) {
<<<<<<< HEAD
  if (err) {
    console.error('Error cleaning up old sessions:', err);
  } else if (this.changes > 0) {
=======
  if (err && !err.message.includes('no such table')) {
    console.error('Error cleaning up old sessions:', err);
  } else if (!err && this.changes > 0) {
>>>>>>> 3a26729 (Update NTS Server)
    console.log(`🧹 Очищено ${this.changes} старих сесій при запуску`);
  }
});

// --- Авторизація ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Валідація вхідних даних
  const validationErrors = validateUserInput(username, password);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('Database error in login:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (!user) return res.status(401).json({ message: 'Invalid login credentials' });

    try {
    const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'Invalid login credentials' });

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
<<<<<<< HEAD
    // Додаємо сесію в активні
    db.run(`
      INSERT INTO active_sessions (username, token, ip, login_time, last_activity, is_active)
      VALUES (?, ?, ?, datetime('now'), datetime('now'), 1)
    `, [user.username, token, req.ip], (err) => {
=======
    // Отримуємо геолокацію IP
    const location = await getIPLocation(req.ip);
    
    // Додаємо сесію в активні з геолокацією
    db.run(`
      INSERT INTO active_sessions (username, token, ip, country, city, region, timezone, user_agent, login_time, last_activity, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
    `, [
      user.username, 
      token, 
      req.ip, 
      location.country, 
      location.city, 
      location.region, 
      location.timezone,
      req.ipInfo.userAgent
    ], (err) => {
>>>>>>> 3a26729 (Update NTS Server)
      if (err) {
        console.error('Error adding active session:', err);
      }
    });
    
<<<<<<< HEAD
    // Логуємо успішний логін
    logSystemEvent('info', `User ${user.username} logged in successfully`, user.username, req.ip);
=======
    // Логуємо успішний логін з геолокацією
    logSystemEvent('info', `User ${user.username} logged in from ${location.country}, ${location.city}`, user.username, req.ip);
>>>>>>> 3a26729 (Update NTS Server)
    
    res.json({ token });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
});

// --- Захищений маршрут /dashboard ---
app.get('/dashboard', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ message: `Welcome ${user.username}! This is your dashboard.` });
  } catch {
    res.status(403).json({ message: 'Invalid token' });
  }
});

// --- Перевірка токена ---
app.post('/verify', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    console.log('Token verification failed: No token provided');
    return res.status(400).json({ valid: false, message: 'Token не передано' });
  }

  db.get('SELECT * FROM revoked_tokens WHERE token = ?', [token], (err, row) => {
    if (err) {
      console.error('Database error in token verification:', err);
      return res.status(500).json({ valid: false, message: 'Internal server error' });
    }
    
    if (row) {
      console.log('Token verification failed: Token revoked');
      return res.json({ valid: false, revoked: true, message: 'Token revoked' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`Token verification successful for user: ${decoded.username}`);
      return res.json({ valid: true, user: decoded.username });
    } catch (jwtError) {
      console.log('Token verification failed: Invalid token', jwtError.message);
      return res.json({ valid: false, message: 'Invalid or expired token' });
    }
  });
});
// --- Відкликання токена (logout) ---
app.post('/logout-user', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    console.log('Logout failed: No token provided');
    return res.status(400).json({ success: false, message: 'Token не передано' });
  }

  // Додаємо токен у таблицю revoked_tokens
  db.run('INSERT OR IGNORE INTO revoked_tokens (token) VALUES (?)', [token], function(err) {
    if (err) {
      console.error('Database error in logout:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    
    console.log(`Token revoked successfully. Changes: ${this.changes}`);
    return res.json({ success: true, message: 'Користувач вилогований (token revoked)' });
  });
});
// --- Додати нового користувача ---
app.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, tag, is_admin } = req.body;
  
  // Валідація вхідних даних
  const validationErrors = validateUserInput(username, password);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
  }
  
  // Перевірка, чи користувач не намагається створити адміна
  if (username.toLowerCase() === 'admin') {
    return res.status(403).json({ message: 'Cannot create admin user' });
  }

  // Валідація тегу
  if (!tag || !['RZ', 'LB', 'KR'].includes(tag)) {
    return res.status(400).json({ message: 'Invalid tag. Must be RZ, LB, or KR' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdminValue = is_admin ? 1 : 0;
    
    db.run('INSERT INTO users (username, password, tag, is_admin) VALUES (?, ?, ?, ?)', 
      [username, hashedPassword, tag, isAdminValue], function(err) {
        if (err) {
          console.error('Database error in add user:', err);
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'User already exists' });
          }
          return res.status(500).json({ message: 'Internal server error' });
        }
        
        const roleText = isAdminValue ? 'адміністратором' : 'звичайним користувачем';
        res.json({ 
          message: `Користувач ${username} доданий як ${roleText} з тегом ${tag}`, 
          id: this.lastID 
        });
      });
  } catch (error) {
    console.error('Error in add user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Видалити користувача ---
app.delete('/users/:username', authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.params;
  
  // Валідація username
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ message: 'Invalid username' });
  }
  
  if (username === 'Admin') {
    return res.status(403).json({ message: 'Cannot delete Admin user' });
  }

  db.run('DELETE FROM users WHERE username = ?', [username], function(err) {
    if (err) {
      console.error('Database error in delete user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: `User ${username} deleted successfully` });
  });
});

// --- Переглянути список користувачів з пагінацією ---
app.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // Отримуємо загальну кількість користувачів
  db.get('SELECT COUNT(*) as total FROM users', [], (err, countResult) => {
    if (err) {
      console.error('Database error in get users count:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    // Отримуємо користувачів з пагінацією
    db.all('SELECT id, username, tag, is_admin, COALESCE(created_at, datetime("now")) as created_at FROM users ORDER BY COALESCE(created_at, datetime("now")) DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        console.error('Database error in get users:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      
<<<<<<< HEAD
      res.json({
        users: rows,
=======
      // Форматуємо дати для Польщі
      const formattedUsers = rows.map(user => ({
        ...user,
        created_at_formatted: formatDateForPoland(user.created_at)
      }));
      
      res.json({
        users: formattedUsers,
>>>>>>> 3a26729 (Update NTS Server)
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalUsers: total,
          limit: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
});

// --- Оновити тег користувача ---
app.put('/users/:username/tag', authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.params;
  const { tag } = req.body;
  
  // Валідація тегу
  const validTags = ['RZ', 'LB', 'KR'];
  if (tag && !validTags.includes(tag)) {
    return res.status(400).json({ message: 'Invalid tag. Must be one of: RZ, LB, KR' });
  }
  
  if (username === 'Admin') {
    return res.status(403).json({ message: 'Cannot modify Admin user tag' });
  }

  db.run('UPDATE users SET tag = ? WHERE username = ?', [tag || null, username], function(err) {
    if (err) {
      console.error('Database error in update user tag:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: `Tag updated for user ${username}`, tag: tag });
  });
});

// --- Створення backup бази даних ---
app.post('/backup', authenticateToken, requireAdmin, (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `database_backup_${timestamp}.db`;
  const backupPath = path.join(__dirname, 'backups', backupName);
  
  // Створюємо папку backups якщо не існує
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  try {
    fs.copyFileSync('./database.db', backupPath);
    console.log(`✅ Backup created: ${backupName}`);
    res.json({ 
      success: true, 
      message: 'Backup створено успішно',
      filename: backupName,
      path: backupPath
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Помилка створення backup' 
    });
  }
});

// --- Отримання списку backup файлів ---
app.get('/backups', authenticateToken, requireAdmin, (req, res) => {
  const backupsDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    return res.json({ backups: [] });
  }
  
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ backups: files });
  } catch (error) {
    console.error('Error reading backups:', error);
    res.status(500).json({ message: 'Помилка читання backup файлів' });
  }
});

// --- Відновлення з backup ---
app.post('/restore/:filename', authenticateToken, requireAdmin, (req, res) => {
  const { filename } = req.params;
  const backupPath = path.join(__dirname, 'backups', filename);
  
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ message: 'Backup файл не знайдено' });
  }
  
  try {
    // Створюємо backup поточної бази перед відновленням
    const currentBackup = `database_before_restore_${Date.now()}.db`;
    fs.copyFileSync('./database.db', path.join(__dirname, 'backups', currentBackup));
    
    // Відновлюємо з backup
    fs.copyFileSync(backupPath, './database.db');
    
    console.log(`✅ Database restored from: ${filename}`);
    res.json({ 
      success: true, 
      message: `База даних відновлена з ${filename}`,
      currentBackup: currentBackup
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Помилка відновлення бази даних' 
    });
  }
});

// --- Статистика користувачів ---
app.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM users',
    'SELECT COUNT(*) as admin_count FROM users WHERE is_admin = 1',
    'SELECT tag, COUNT(*) as count FROM users WHERE tag IS NOT NULL GROUP BY tag',
    'SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at IS NOT NULL GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30'
  ];
  
  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ))
  .then(([total, adminCount, tagStats, dailyStats]) => {
    res.json({
      totalUsers: total[0].total,
      adminCount: adminCount[0].admin_count,
      tagDistribution: tagStats,
      dailyRegistrations: dailyStats
    });
  })
  .catch(error => {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Помилка отримання статистики' });
  });
});

// --- Логи системи ---
app.get('/logs', authenticateToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  // Отримуємо логи з бази даних (якщо є таблиця logs)
  db.all(`
    SELECT * FROM system_logs 
    ORDER BY timestamp DESC 
    LIMIT ? OFFSET ?
  `, [limit, offset], (err, rows) => {
    if (err) {
      // Якщо таблиці немає, повертаємо порожній масив
      return res.json({ logs: [], pagination: { currentPage: 1, totalPages: 1 } });
    }
    
    db.get('SELECT COUNT(*) as total FROM system_logs', [], (err, countResult) => {
      if (err) {
        return res.status(500).json({ message: 'Помилка отримання логів' });
      }
      
      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);
      
<<<<<<< HEAD
      res.json({
        logs: rows,
=======
      // Форматуємо дати для Польщі
      const formattedLogs = rows.map(log => ({
        ...log,
        timestamp_formatted: formatDateTimeForPoland(log.timestamp)
      }));
      
      res.json({
        logs: formattedLogs,
>>>>>>> 3a26729 (Update NTS Server)
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalLogs: total,
          limit: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
});

// --- Пошук користувачів ---
app.get('/users/search', authenticateToken, requireAdmin, (req, res) => {
  const { q, tag, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  let params = [];
  
  if (q) {
    whereClause += ' AND username LIKE ?';
    params.push(`%${q}%`);
  }
  
  if (tag) {
    whereClause += ' AND tag = ?';
    params.push(tag);
  }
  
  const validSortFields = ['username', 'created_at', 'tag'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  const query = `
    SELECT id, username, tag, COALESCE(created_at, datetime("now")) as created_at 
    FROM users 
    ${whereClause}
    ORDER BY ${sortField} ${order}
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit, offset);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Search error:', err);
      return res.status(500).json({ message: 'Помилка пошуку' });
    }
    
    // Отримуємо загальну кількість
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    db.get(countQuery, params.slice(0, -2), (err, countResult) => {
      if (err) {
        return res.status(500).json({ message: 'Помилка підрахунку' });
      }
      
      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);
      
<<<<<<< HEAD
      res.json({
        users: rows,
=======
      // Форматуємо дати для Польщі
      const formattedUsers = rows.map(user => ({
        ...user,
        created_at_formatted: formatDateForPoland(user.created_at)
      }));
      
      res.json({
        users: formattedUsers,
>>>>>>> 3a26729 (Update NTS Server)
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalUsers: total,
          limit: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
});

// --- Змінити права адміністратора ---
app.put('/users/:username/admin', authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.params;
  const { is_admin } = req.body;
  
  if (username === 'Admin') {
    return res.status(403).json({ message: 'Cannot modify Admin user rights' });
  }
  
  if (typeof is_admin !== 'boolean') {
    return res.status(400).json({ message: 'Invalid is_admin value. Must be boolean' });
  }
  
  db.run('UPDATE users SET is_admin = ? WHERE username = ?', [is_admin ? 1 : 0, username], function(err) {
    if (err) {
      console.error('Database error in update admin rights:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const action = is_admin ? 'надано' : 'відкликано';
    res.json({ 
      message: `Адмін права ${action} користувачу ${username}`,
      is_admin: is_admin
    });
  });
});

// --- Масові операції ---
app.post('/users/bulk', authenticateToken, requireAdmin, (req, res) => {
  const { action, usernames, tag } = req.body;
  
  if (!action || !usernames || !Array.isArray(usernames)) {
    return res.status(400).json({ message: 'Невірні параметри для масової операції' });
  }
  
  if (usernames.includes('Admin')) {
    return res.status(403).json({ message: 'Не можна виконувати операції з Admin користувачем' });
  }
  
  let query, params;
  
  switch (action) {
    case 'delete':
      query = `DELETE FROM users WHERE username IN (${usernames.map(() => '?').join(',')})`;
      params = usernames;
      break;
    case 'update_tag':
      if (!tag) {
        return res.status(400).json({ message: 'Тег не вказано' });
      }
      const validTags = ['RZ', 'LB', 'KR'];
      if (!validTags.includes(tag)) {
        return res.status(400).json({ message: 'Невірний тег' });
      }
      query = `UPDATE users SET tag = ? WHERE username IN (${usernames.map(() => '?').join(',')})`;
      params = [tag, ...usernames];
      break;
    default:
      return res.status(400).json({ message: 'Невідома операція' });
  }
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Bulk operation error:', err);
      return res.status(500).json({ message: 'Помилка виконання масової операції' });
    }
    
    res.json({
      success: true,
      message: `Операція "${action}" виконана для ${this.changes} користувачів`,
      affectedRows: this.changes
    });
  });
});

// --- Експорт користувачів ---
app.get('/users/export', authenticateToken, requireAdmin, (req, res) => {
  const { format = 'csv' } = req.query;
  
  db.all('SELECT id, username, tag, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Export error:', err);
      return res.status(500).json({ message: 'Помилка експорту' });
    }
    
    if (format === 'csv') {
      let csv = 'ID,Username,Tag,Created At\n';
      rows.forEach(row => {
<<<<<<< HEAD
        csv += `${row.id},"${row.username}","${row.tag || ''}","${row.created_at || ''}"\n`;
=======
        csv += `${row.id},"${row.username}","${row.tag || ''}","${formatDateTimeForPoland(row.created_at)}"\n`;
>>>>>>> 3a26729 (Update NTS Server)
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csv);
    } else {
      res.json({ users: rows });
    }
  });
});

// --- Отримання активних сесій ---
app.get('/sessions', authenticateToken, requireAdmin, (req, res) => {
  // Отримуємо тільки останню активну сесію для кожного користувача
  db.all(`
    SELECT 
      s.username, 
      s.login_time,
      s.last_activity,
      s.ip,
      s.country,
      s.city,
      s.region,
      s.timezone,
      s.user_agent,
      u.tag,
      u.id
    FROM active_sessions s
    JOIN users u ON s.username = u.username
    WHERE s.is_active = 1
    AND s.last_activity = (
      SELECT MAX(last_activity) 
      FROM active_sessions s2 
      WHERE s2.username = s.username AND s2.is_active = 1
    )
    ORDER BY s.last_activity DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Sessions error:', err);
      return res.status(500).json({ message: 'Помилка отримання активних сесій' });
    }
    
    // Форматуємо дані для відображення
    const sessionsWithActivity = rows.map(session => ({
      username: session.username,
      id: session.id,
      tag: session.tag,
      login_time: session.login_time,
      login_time_formatted: formatDateTimeForPoland(session.login_time),
      last_activity: session.last_activity,
      last_activity_formatted: formatDateTimeForPoland(session.last_activity),
      ip: session.ip,
      location: `${session.city}, ${session.country}`,
      country: session.country,
      city: session.city,
      region: session.region,
      timezone: session.timezone,
      user_agent: session.user_agent,
      status: 'online'
    }));
    
    res.json({ sessions: sessionsWithActivity });
  });
});

// --- Вилогування користувача за іменем ---
app.post('/sessions/logout/:username', authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.params;
  
  if (username === 'Admin') {
    return res.status(403).json({ message: 'Не можна вилогувати Admin користувача' });
  }
  
  // Деактивуємо всі активні сесії користувача
  db.run(`
    UPDATE active_sessions 
    SET is_active = 0 
    WHERE username = ? AND is_active = 1
  `, [username], function(err) {
    if (err) {
      console.error('Logout user error:', err);
      return res.status(500).json({ message: 'Помилка вилогування користувача' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Активних сесій не знайдено' });
    }
    
    // Додаємо токени в revoked_tokens
    db.all('SELECT token FROM active_sessions WHERE username = ? AND is_active = 0', [username], (err, sessions) => {
      if (err) {
        console.error('Error getting sessions for revoke:', err);
      } else {
        sessions.forEach(session => {
          db.run(`
            INSERT OR IGNORE INTO revoked_tokens (token, revoked_at) 
            VALUES (?, datetime('now'))
          `, [session.token], (err) => {
            if (err) {
              console.error('Error adding token to revoked_tokens:', err);
            }
          });
        });
      }
    });
    
    // Логуємо дію
    logSystemEvent('info', `User ${username} logged out by admin`, req.user.username, req.ip);
    
    res.json({ 
      success: true, 
      message: `Користувач ${username} успішно вилогований`,
      affectedUser: username,
      sessionsClosed: this.changes
    });
  });
});

// --- Масове вилогування всіх користувачів ---
app.post('/sessions/logout-all', authenticateToken, requireAdmin, (req, res) => {
  // Деактивуємо всі активні сесії крім Admin
  db.run(`
    UPDATE active_sessions 
    SET is_active = 0 
    WHERE username != 'Admin' AND is_active = 1
  `, [], function(err) {
    if (err) {
      console.error('Logout all error:', err);
      return res.status(500).json({ message: 'Помилка масового вилогування' });
    }
    
    if (this.changes === 0) {
      return res.json({ 
        success: true, 
        message: 'Немає активних сесій для вилогування',
        affectedUsers: 0
      });
    }
    
    // Додаємо всі токени в revoked_tokens
    db.all('SELECT token FROM active_sessions WHERE is_active = 0', [], (err, sessions) => {
      if (err) {
        console.error('Error getting sessions for revoke:', err);
      } else {
        sessions.forEach(session => {
          db.run(`
            INSERT OR IGNORE INTO revoked_tokens (token, revoked_at) 
            VALUES (?, datetime('now'))
          `, [session.token], (err) => {
            if (err) {
              console.error('Error adding token to revoked_tokens:', err);
            }
          });
        });
      }
    });
    
    // Логуємо дію
    logSystemEvent('warn', `All users logged out by admin`, req.user.username, req.ip);
    
    res.json({ 
      success: true, 
      message: `Вилоговано ${this.changes} активних сесій`,
      affectedUsers: this.changes
    });
  });
});

<<<<<<< HEAD
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: public/`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
=======
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://164.92.182.162:${PORT}`);
  console.log(`🌐 Network access: http://164.92.182.162:${PORT}`);
  console.log(`📁 Serving static files from: public/`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Listening on all network interfaces (0.0.0.0:${PORT})`);
>>>>>>> 3a26729 (Update NTS Server)
});

// --- Очищення старих сесій ---
app.post('/sessions/cleanup', authenticateToken, requireAdmin, (req, res) => {
  // Деактивуємо сесії старше 24 годин
  db.run(`
    UPDATE active_sessions 
    SET is_active = 0 
    WHERE datetime('now', '-24 hours') > last_activity AND is_active = 1
  `, [], function(err) {
    if (err) {
      console.error('Cleanup sessions error:', err);
      return res.status(500).json({ message: 'Помилка очищення сесій' });
    }
    
    res.json({ 
      success: true, 
      message: `Очищено ${this.changes} старих сесій`,
      cleanedSessions: this.changes
    });
  });
});

// --- Health check endpoint ---
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    server: 'NTS Server',
    version: '1.0.0'
  });
});

<<<<<<< HEAD
=======
// --- Управління дозволеними IP адресами ---
app.get('/security/allowed-ips', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM allowed_ips ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching allowed IPs:', err);
      return res.status(500).json({ message: 'Помилка отримання дозволених IP' });
    }
    
    // Форматуємо дати для Польщі
    const formattedIPs = rows.map(ip => ({
      ...ip,
      created_at_formatted: formatDateForPoland(ip.created_at)
    }));
    
    res.json({ allowedIPs: formattedIPs });
  });
});

app.post('/security/allowed-ips', authenticateToken, requireAdmin, (req, res) => {
  const { ip_address, description } = req.body;
  
  if (!ip_address) {
    return res.status(400).json({ message: 'IP адреса обов\'язкова' });
  }
  
  db.run('INSERT INTO allowed_ips (ip_address, description) VALUES (?, ?)', 
    [ip_address, description || ''], function(err) {
      if (err) {
        console.error('Error adding allowed IP:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ message: 'IP адреса вже існує' });
        }
        return res.status(500).json({ message: 'Помилка додавання IP' });
      }
      
      res.json({ 
        message: `IP адреса ${ip_address} додана до дозволених`, 
        id: this.lastID 
      });
    });
});

app.delete('/security/allowed-ips/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM allowed_ips WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting allowed IP:', err);
      return res.status(500).json({ message: 'Помилка видалення IP' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'IP адреса не знайдена' });
    }
    res.json({ message: 'IP адреса видалена з дозволених' });
  });
});

// --- Управління заблокованими IP адресами ---
app.get('/security/blocked-ips', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM blocked_ips ORDER BY blocked_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching blocked IPs:', err);
      return res.status(500).json({ message: 'Помилка отримання заблокованих IP' });
    }
    
    // Форматуємо дати для Польщі
    const formattedIPs = rows.map(ip => ({
      ...ip,
      blocked_at_formatted: formatDateForPoland(ip.blocked_at)
    }));
    
    res.json({ blockedIPs: formattedIPs });
  });
});

app.post('/security/blocked-ips', authenticateToken, requireAdmin, (req, res) => {
  const { ip_address, reason } = req.body;
  
  if (!ip_address) {
    return res.status(400).json({ message: 'IP адреса обов\'язкова' });
  }
  
  db.run('INSERT INTO blocked_ips (ip_address, reason, blocked_by) VALUES (?, ?, ?)', 
    [ip_address, reason || 'Заблоковано адміністратором', req.user.username], function(err) {
      if (err) {
        console.error('Error adding blocked IP:', err);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ message: 'IP адреса вже заблокована' });
        }
        return res.status(500).json({ message: 'Помилка блокування IP' });
      }
      
      logSystemEvent('warn', `IP ${ip_address} blocked by ${req.user.username}`, req.user.username, req.ip);
      res.json({ 
        message: `IP адреса ${ip_address} заблокована`, 
        id: this.lastID 
      });
    });
});

app.delete('/security/blocked-ips/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM blocked_ips WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting blocked IP:', err);
      return res.status(500).json({ message: 'Помилка розблокування IP' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'IP адреса не знайдена' });
    }
    res.json({ message: 'IP адреса розблокована' });
  });
});

// --- Статистика безпеки ---
app.get('/security/stats', authenticateToken, requireAdmin, (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM allowed_ips WHERE is_active = 1',
    'SELECT COUNT(*) as total FROM blocked_ips WHERE is_active = 1',
    'SELECT country, COUNT(*) as count FROM active_sessions WHERE is_active = 1 GROUP BY country ORDER BY count DESC',
    'SELECT ip, country, city, COUNT(*) as login_count FROM active_sessions WHERE is_active = 1 GROUP BY ip ORDER BY login_count DESC LIMIT 10'
  ];
  
  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ))
  .then(([allowedCount, blockedCount, countryStats, topIPs]) => {
    res.json({
      allowedIPs: allowedCount[0].total,
      blockedIPs: blockedCount[0].total,
      countryDistribution: countryStats,
      topIPs: topIPs
    });
  })
  .catch(error => {
    console.error('Security stats error:', error);
    res.status(500).json({ message: 'Помилка отримання статистики безпеки' });
  });
});

>>>>>>> 3a26729 (Update NTS Server)
// --- Token status endpoint ---
app.get('/token-status', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user.username,
    timestamp: new Date().toISOString()
  });
});

// 404 обробник
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});
