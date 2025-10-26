const os = require('os');
const fs = require('fs');
const path = require('path');

// Конфігурація моніторингу
const config = {
  logFile: './logs/monitor.log',
  healthCheckInterval: 30000, // 30 секунд
  memoryThreshold: 80, // Відсоток використання пам'яті
  diskThreshold: 90, // Відсоток використання диска
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5
};

// Функція для логування
function logMessage(level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Виводимо в консоль
  console.log(logEntry.trim());
  
  // Записуємо в файл
  try {
    // Створюємо папку logs якщо не існує
    const logsDir = path.dirname(config.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.appendFileSync(config.logFile, logEntry);
    
    // Очищаємо логи якщо вони занадто великі
    cleanupLogs();
  } catch (error) {
    console.error('Помилка запису в лог файл:', error);
  }
}

// Функція для очищення старих логів
function cleanupLogs() {
  try {
    if (!fs.existsSync(config.logFile)) {
      return;
    }
    
    const stats = fs.statSync(config.logFile);
    if (stats.size > config.maxLogSize) {
      // Ротація логів
      for (let i = config.maxLogFiles - 1; i > 0; i--) {
        const oldFile = `${config.logFile}.${i}`;
        const newFile = `${config.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === config.maxLogFiles - 1) {
            fs.unlinkSync(oldFile); // Видаляємо найстаріший файл
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Перейменовуємо поточний файл
      fs.renameSync(config.logFile, `${config.logFile}.1`);
      logMessage('info', 'Лог файл ротаційний через перевищення розміру');
    }
  } catch (error) {
    console.error('Помилка очищення логів:', error);
  }
}

// Функція для отримання системної інформації
function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = (usedMem / totalMem) * 100;
  
  const cpus = os.cpus();
  const cpuModel = cpus[0].model;
  const cpuCount = cpus.length;
  
  // Отримуємо інформацію про диск
  let diskUsage = null;
  try {
    const stats = fs.statSync('.');
    // Простий спосіб - перевіряємо чи можемо створювати файли
    diskUsage = { available: true };
  } catch (error) {
    diskUsage = { available: false, error: error.message };
  }
  
  const uptime = os.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  
  return {
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: Math.round(memUsagePercent * 100) / 100
    },
    cpu: {
      model: cpuModel,
      count: cpuCount
    },
    disk: diskUsage,
    uptime: {
      seconds: uptime,
      hours: uptimeHours,
      minutes: uptimeMinutes,
      formatted: `${uptimeHours}h ${uptimeMinutes}m`
    },
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  };
}

// Функція для перевірки здоров'я сервера
function checkServerHealth() {
  const systemInfo = getSystemInfo();
  const alerts = [];
  
  // Перевірка пам'яті
  if (systemInfo.memory.usagePercent > config.memoryThreshold) {
    alerts.push({
      type: 'memory',
      level: 'warning',
      message: `Високе використання пам'яті: ${systemInfo.memory.usagePercent}%`
    });
  }
  
  // Перевірка диска
  if (systemInfo.disk.available === false) {
    alerts.push({
      type: 'disk',
      level: 'error',
      message: `Проблеми з диском: ${systemInfo.disk.error}`
    });
  }
  
  // Перевірка uptime
  if (systemInfo.uptime.hours > 24 * 7) { // Більше тижня без перезапуску
    alerts.push({
      type: 'uptime',
      level: 'info',
      message: `Сервер працює без перезапуску: ${systemInfo.uptime.formatted}`
    });
  }
  
  return {
    status: alerts.length === 0 ? 'healthy' : 'warning',
    alerts: alerts,
    systemInfo: systemInfo
  };
}

// Функція для перевірки стану PM2 процесів
function checkPM2Status() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        logMessage('error', `Помилка отримання статусу PM2: ${error.message}`);
        resolve({ error: error.message });
        return;
      }
      
      try {
        const pm2Data = JSON.parse(stdout);
        const ntsServer = pm2Data.find(app => app.name === 'nts-server');
        
        if (ntsServer) {
          resolve({
            status: ntsServer.pm2_env.status,
            uptime: ntsServer.pm2_env.uptime,
            memory: ntsServer.monit.memory,
            cpu: ntsServer.monit.cpu,
            restarts: ntsServer.pm2_env.restart_time,
            pid: ntsServer.pid
          });
        } else {
          resolve({ error: 'NTS Server не знайдено в PM2' });
        }
      } catch (parseError) {
        logMessage('error', `Помилка парсингу PM2 даних: ${parseError.message}`);
        resolve({ error: 'Помилка парсингу PM2 даних' });
      }
    });
  });
}

// Основна функція моніторингу
async function startMonitoring() {
  logMessage('info', 'Запуск моніторингу NTS Server');
  
  const monitorInterval = setInterval(async () => {
    try {
      // Перевірка здоров'я системи
      const healthCheck = checkServerHealth();
      
      // Перевірка PM2 статусу
      const pm2Status = await checkPM2Status();
      
      // Логування результатів
      logMessage('info', `Система: ${healthCheck.status}, PM2: ${pm2Status.status || 'unknown'}`);
      logMessage('info', `Пам'ять: ${healthCheck.systemInfo.memory.usagePercent}%, Uptime: ${healthCheck.systemInfo.uptime.formatted}`);
      
      // Логування попереджень
      if (healthCheck.alerts.length > 0) {
        healthCheck.alerts.forEach(alert => {
          logMessage(alert.level, alert.message);
        });
      }
      
      // Перевірка PM2 статусу
      if (pm2Status.error) {
        logMessage('error', `PM2: ${pm2Status.error}`);
      } else if (pm2Status.status !== 'online') {
        logMessage('warning', `PM2 статус: ${pm2Status.status}`);
      }
      
    } catch (error) {
      logMessage('error', `Помилка моніторингу: ${error.message}`);
    }
  }, config.healthCheckInterval);
  
  // Обробка сигналів завершення
  process.on('SIGINT', () => {
    logMessage('info', 'Зупинка моніторингу...');
    clearInterval(monitorInterval);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logMessage('info', 'Зупинка моніторингу...');
    clearInterval(monitorInterval);
    process.exit(0);
  });
}

// Експорт функцій
module.exports = {
  getSystemInfo,
  checkServerHealth,
  checkPM2Status,
  startMonitoring,
  logMessage
};

// Якщо скрипт запущений безпосередньо
if (require.main === module) {
  console.log('🔍 Запуск моніторингу NTS Server...');
  startMonitoring();
}

