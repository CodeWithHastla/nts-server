const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Конфігурація backup
const config = {
  databasePath: './database.db',
  backupDir: './backups',
  retentionDays: 30, // Кількість днів зберігання backup файлів
  maxBackups: 50 // Максимальна кількість backup файлів
};

// Функція для створення backup
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `database_backup_${timestamp}.db`;
  const backupPath = path.join(config.backupDir, backupName);
  
  // Створюємо папку backups якщо не існує
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log(`✅ Створено папку backups: ${config.backupDir}`);
  }
  
  try {
    // Копіюємо базу даних
    fs.copyFileSync(config.databasePath, backupPath);
    console.log(`✅ Backup створено: ${backupName}`);
    
    // Очищаємо старі backup файли
    cleanupOldBackups();
    
    return {
      success: true,
      filename: backupName,
      path: backupPath,
      size: fs.statSync(backupPath).size
    };
  } catch (error) {
    console.error('❌ Помилка створення backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Функція для очищення старих backup файлів
function cleanupOldBackups() {
  try {
    if (!fs.existsSync(config.backupDir)) {
      return;
    }
    
    const files = fs.readdirSync(config.backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(config.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          created: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    // Видаляємо файли старші за retentionDays
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
    
    const filesToDelete = files.filter(file => new Date(file.created) < cutoffDate);
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Видалено старий backup: ${file.name}`);
      } catch (error) {
        console.error(`❌ Помилка видалення ${file.name}:`, error);
      }
    });
    
    // Видаляємо зайві файли якщо їх більше ніж maxBackups
    if (files.length > config.maxBackups) {
      const excessFiles = files.slice(config.maxBackups);
      excessFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Видалено зайвий backup: ${file.name}`);
        } catch (error) {
          console.error(`❌ Помилка видалення ${file.name}:`, error);
        }
      });
    }
    
    console.log(`🧹 Очищення backup завершено. Видалено ${filesToDelete.length + Math.max(0, files.length - config.maxBackups)} файлів`);
  } catch (error) {
    console.error('❌ Помилка очищення backup файлів:', error);
  }
}

// Функція для отримання статистики backup
function getBackupStats() {
  try {
    if (!fs.existsSync(config.backupDir)) {
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null
      };
    }
    
    const files = fs.readdirSync(config.backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(config.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime
        };
      });
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const sortedFiles = files.sort((a, b) => new Date(a.created) - new Date(b.created));
    
    return {
      totalBackups: files.length,
      totalSize: totalSize,
      oldestBackup: sortedFiles.length > 0 ? sortedFiles[0] : null,
      newestBackup: sortedFiles.length > 0 ? sortedFiles[sortedFiles.length - 1] : null,
      files: files
    };
  } catch (error) {
    console.error('❌ Помилка отримання статистики backup:', error);
    return null;
  }
}

// Експортуємо функції
module.exports = {
  createBackup,
  cleanupOldBackups,
  getBackupStats,
  config
};

// Якщо скрипт запущений безпосередньо
if (require.main === module) {
  console.log('🔄 Запуск автоматичного backup...');
  const result = createBackup();
  
  if (result.success) {
    console.log('✅ Backup успішно створено');
    console.log(`📁 Файл: ${result.filename}`);
    console.log(`📊 Розмір: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('❌ Помилка створення backup:', result.error);
    process.exit(1);
  }
  
  // Показуємо статистику
  const stats = getBackupStats();
  if (stats) {
    console.log('\n📊 Статистика backup:');
    console.log(`📦 Всього backup файлів: ${stats.totalBackups}`);
    console.log(`💾 Загальний розмір: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    if (stats.newestBackup) {
      console.log(`🆕 Найновіший: ${stats.newestBackup.name}`);
    }
    if (stats.oldestBackup) {
      console.log(`🗓️ Найстаріший: ${stats.oldestBackup.name}`);
    }
  }
}

