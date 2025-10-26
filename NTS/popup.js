const loginWindow = document.getElementById('loginWindow');
const timerWindow = document.getElementById('timerWindow');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');
const timerDiv = document.getElementById('timer');

let timerInterval;
let secondsElapsed = 0;
let sessionStartTime = null;
let generateCount = 0;
let autoLogoutTimer = null;

// Константи
const API_BASE_URL = "http://164.92.182.162:8000";
const AUTO_LOGOUT_HOURS = 4;
const AUTO_LOGOUT_MS = AUTO_LOGOUT_HOURS * 60 * 60 * 1000;

// Функція форматування часу
function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2,'0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2,'0');
  const s = String(seconds % 60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

// === СИСТЕМА СПОВІЩЕНЬ ===
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 15px;
    border-radius: 5px;
    color: white;
    font-size: 12px;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 200px;
    word-wrap: break-word;
  `;
  
  // Кольори для різних типів
  const colors = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#ff9800',
    error: '#f44336'
  };
  
  notification.style.background = colors[type] || colors.info;
  document.body.appendChild(notification);
  
  // Анімація появи
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  });
  
  // Автоматичне приховування
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// === ПЕРЕВІРКА СТАТУСУ СЕРВЕРА ===
async function checkServerStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// === ЗАВАНТАЖЕННЯ СТАТИСТИКИ КОРИСТУВАЧА ===
async function loadUserStats() {
  try {
    const { nts_token } = await chrome.storage.local.get(['nts_token']);
    if (!nts_token) return null;
    
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: { 'Authorization': 'Bearer ' + nts_token }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Помилка завантаження статистики:', error);
  }
  return null;
}

// === ПЕРЕВІРКА ВИКОРИСТАННЯ МІСЦЯ ===
async function getStorageUsage() {
  try {
    // Отримуємо всі дані з localStorage
    const allData = await chrome.storage.local.get(null);
    let totalSize = 0;
    let itemCount = 0;
    
    for (const [key, value] of Object.entries(allData)) {
      const itemSize = JSON.stringify(value).length;
      totalSize += itemSize;
      itemCount++;
    }
    
    // Ліміти Chrome Extension storage
    const maxStorage = 5 * 1024 * 1024; // 5MB для chrome.storage.local
    const usagePercent = (totalSize / maxStorage) * 100;
    
    return {
      totalSize,
      itemCount,
      formattedSize: formatBytes(totalSize),
      maxStorage,
      formattedMaxSize: formatBytes(maxStorage),
      usagePercent: Math.round(usagePercent * 100) / 100,
      isNearLimit: usagePercent > 80,
      isOverLimit: usagePercent > 95
    };
  } catch (error) {
    console.error('Помилка перевірки storage:', error);
    return { 
      totalSize: 0, 
      itemCount: 0, 
      formattedSize: '0 B',
      maxStorage: 5 * 1024 * 1024,
      formattedMaxSize: '5 MB',
      usagePercent: 0,
      isNearLimit: false,
      isOverLimit: false
    };
  }
}

// === ФОРМАТУВАННЯ БАЙТІВ ===
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === ОНОВЛЕННЯ СТАТИСТИКИ СЕСІЇ ===
async function updateSessionStats() {
  const statsContainer = document.getElementById('sessionStats');
  if (!statsContainer) return;
  
  const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
  const hours = Math.floor(sessionTime / 3600);
  const minutes = Math.floor((sessionTime % 3600) / 60);
  
  // Отримуємо інформацію про використання storage
  const storageInfo = await getStorageUsage();
  
  // Визначаємо колір для відображення використання кешу
  let cacheColor = '#4CAF50'; // зелений
  let cacheStatus = '';
  
  if (storageInfo.isOverLimit) {
    cacheColor = '#f44336'; // червоний
    cacheStatus = ' ⚠️ КРИТИЧНО';
  } else if (storageInfo.isNearLimit) {
    cacheColor = '#ff9800'; // помаранчевий
    cacheStatus = ' ⚠️ БАГАТО';
  }
  
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Час сесії:</span>
      <span class="stat-value">${hours}г ${minutes}хв</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Generate натискань:</span>
      <span class="stat-value">${generateCount}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Кеш:</span>
      <span class="stat-value" style="color: ${cacheColor}">${storageInfo.formattedSize} / ${storageInfo.formattedMaxSize} (${storageInfo.usagePercent}%)${cacheStatus}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Елементів в кеші:</span>
      <span class="stat-value">${storageInfo.itemCount}</span>
    </div>
  `;
}

// === ДОДАВАННЯ ШВИДКИХ ДІЙ ===
async function addQuickActions() {
  console.log('⚡ Додаємо швидкі дії');
  const quickActionsContainer = document.getElementById('quickActions');
  if (!quickActionsContainer) {
    console.error('❌ Контейнер quickActions не знайдено');
    return;
  }
  
  // Перевіряємо права доступу користувача
  const { nts_token } = await chrome.storage.local.get(['nts_token']);
  let isAdmin = false;
  
  if (nts_token) {
    try {
      const testResponse = await fetch(`${API_BASE_URL}/users/export?format=json`, {
        headers: { 'Authorization': 'Bearer ' + nts_token }
      });
      isAdmin = testResponse.ok;
    } catch (error) {
      console.log('Помилка перевірки прав доступу:', error);
    }
  }
  
  // Формуємо HTML залежно від прав доступу
  let buttonsHTML = `
    <button class="quick-action-btn" id="timocomBtn">🌐 Timocom</button>
    <button class="quick-action-btn" id="transEuBtn">🚚 Trans.eu</button>
    <button class="quick-action-btn danger" id="clearBtn">🗑️ Очистити</button>
  `;
  
  // Додаємо адміністративні кнопки тільки для адміністраторів
  if (isAdmin) {
    console.log('👑 Користувач є адміністратором - додаємо адміністративні кнопки');
    buttonsHTML += `
      <button class="quick-action-btn" id="exportBtn">📊 Експорт</button>
      <button class="quick-action-btn" id="importBtn">📥 Імпорт</button>
      <button class="quick-action-btn" id="storageBtn">💾 Кеш</button>
      <button class="quick-action-btn danger" id="clearStorageBtn">🧹 Кеш</button>
    `;
  } else {
    console.log('👤 Користувач не є адміністратором - адміністративні кнопки приховані');
  }
  
  quickActionsContainer.innerHTML = buttonsHTML;
  
  // Додаємо обробники подій
  try {
    document.getElementById('timocomBtn').addEventListener('click', openTimocom);
    document.getElementById('transEuBtn').addEventListener('click', openTransEu);
    document.getElementById('clearBtn').addEventListener('click', clearHistory);
    
    // Додаємо адміністративні обробники тільки якщо кнопки існують
    if (isAdmin) {
      document.getElementById('exportBtn').addEventListener('click', exportHistory);
      document.getElementById('importBtn').addEventListener('click', importHistory);
      document.getElementById('storageBtn').addEventListener('click', showStorageDetails);
      document.getElementById('clearStorageBtn').addEventListener('click', clearStorage);
    }
    
    console.log('✅ Обробники подій додано');
  } catch (error) {
    console.error('❌ Помилка додавання обробників:', error);
  }
  
  console.log('✅ Швидкі дії додано з обробниками');
}

// === ШВИДКІ ДІЇ ===
window.openTimocom = function() {
  console.log('🌐 Відкриваємо Timocom');
  chrome.tabs.create({ url: 'https://my.timocom.com' });
}

window.openTransEu = function() {
  console.log('🚚 Відкриваємо Trans.eu');
  chrome.tabs.create({ url: 'https://platform.trans.eu/dashboards' });
}

window.exportHistory = async function() {
  console.log('📊 Початок експорту');
  try {
    const { nts_token } = await chrome.storage.local.get(['nts_token']);
    if (!nts_token) {
      showNotification('Потрібно увійти в систему', 'warning');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/users/export?format=json`, {
      headers: { 'Authorization': 'Bearer ' + nts_token }
    });
    
    if (response.ok) {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nts_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Експорт завершено', 'success');
    } else {
      showNotification('Помилка експорту: ' + response.status, 'error');
    }
  } catch (error) {
    console.error('Помилка експорту:', error);
    showNotification('Помилка підключення до сервера', 'error');
  }
}

window.clearHistory = function() {
  console.log('🗑️ Очищення історії');
  if (confirm('Ви впевнені, що хочете очистити історію?')) {
    chrome.storage.local.remove(['trans_history']);
    showNotification('Історія очищена', 'info');
  }
}

// === ОЧИЩЕННЯ КЕШУ ===
window.clearStorage = async function() {
  console.log('🗑️ Очищення кешу');
  
  const options = [
    'Очистити тільки історію транспорту',
    'Очистити тільки позначені фірми', 
    'Очистити все крім токена та збережених даних',
    'Очистити все повністю (включаючи збережені дані для входу)'
  ];
  
  const choice = prompt(`Що саме очистити?\n\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nВведіть номер (1-4):`);
  
  if (!choice || choice < 1 || choice > 4) return;
  
  try {
    switch (parseInt(choice)) {
      case 1:
        await chrome.storage.local.remove(['trans_history']);
        showNotification('Історія транспорту очищена', 'info');
        break;
        
      case 2:
        await chrome.storage.local.remove(['marked_tc_ids_1', 'marked_tc_ids_2']);
        showNotification('Позначені фірми очищені', 'info');
        break;
        
      case 3:
        const { nts_token, nts_user_id, nts_remember_me, nts_saved_username, nts_saved_password } = await chrome.storage.local.get(['nts_token', 'nts_user_id', 'nts_remember_me', 'nts_saved_username', 'nts_saved_password']);
        await chrome.storage.local.clear();
        const preservedData = {};
        if (nts_token) preservedData.nts_token = nts_token;
        if (nts_user_id) preservedData.nts_user_id = nts_user_id;
        if (nts_remember_me) preservedData.nts_remember_me = nts_remember_me;
        if (nts_saved_username) preservedData.nts_saved_username = nts_saved_username;
        if (nts_saved_password) preservedData.nts_saved_password = nts_saved_password;
        await chrome.storage.local.set(preservedData);
        showNotification('Кеш очищено (токен та збережені дані збережено)', 'info');
        break;
        
      case 4:
        await chrome.storage.local.clear();
        showNotification('Весь кеш очищено (включаючи збережені дані для входу)', 'info');
        // Перезавантажуємо popup
        setTimeout(() => window.location.reload(), 1000);
        break;
    }
    
  // Оновлюємо статистику
  updateSessionStats();
  
  // Перевіряємо ліміти кешу та показуємо попередження
  checkStorageLimits();
    
  } catch (error) {
    console.error('Помилка очищення кешу:', error);
    showNotification('Помилка очищення кешу', 'error');
  }
}

// === ІМПОРТ ІСТОРІЇ ===
window.importHistory = function() {
  console.log('📥 Початок імпорту');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.users && Array.isArray(data.users)) {
        // Імпортуємо користувачів через API
        const { nts_token } = await chrome.storage.local.get(['nts_token']);
        if (!nts_token) {
          showNotification('Потрібно увійти в систему', 'warning');
          return;
        }
        
        
        let imported = 0;
        for (const user of data.users) {
          try {
            const response = await fetch(`${API_BASE_URL}/users`, {
              method: 'POST',
              headers: { 
                'Authorization': 'Bearer ' + nts_token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                username: user.username,
                password: 'imported_user_' + Date.now()
              })
            });
            
            if (response.ok) {
              imported++;
            }
          } catch (error) {
            console.error('Помилка імпорту користувача:', error);
          }
        }
        
        showNotification(`Імпортовано ${imported} користувачів`, 'success');
      } else {
        showNotification('Невірний формат файлу', 'error');
      }
    } catch (error) {
      console.error('Помилка імпорту:', error);
      showNotification('Помилка читання файлу', 'error');
    }
  };
  
  input.click();
}

// === ПЕРЕВІРКА ЛІМІТІВ КЕШУ ===
async function checkStorageLimits() {
  try {
    const storageInfo = await getStorageUsage();
    
    if (storageInfo.isOverLimit) {
      showNotification('🚨 КРИТИЧНО! Кеш заповнений на ' + storageInfo.usagePercent + '%! Очистіть кеш!', 'error');
    } else if (storageInfo.isNearLimit) {
      showNotification('⚠️ УВАГА! Кеш заповнений на ' + storageInfo.usagePercent + '%', 'warning');
    }
  } catch (error) {
    console.error('Помилка перевірки лімітів кешу:', error);
  }
}

// === ДЕТАЛЬНИЙ ПЕРЕГЛЯД STORAGE ===
window.showStorageDetails = async function() {
  console.log('💾 Показуємо деталі storage');
  
  // Перевіряємо права доступу
  const { nts_token } = await chrome.storage.local.get(['nts_token']);
  if (!nts_token) {
    showNotification('Потрібно увійти в систему', 'warning');
    return;
  }
  
  try {
    const testResponse = await fetch(`${API_BASE_URL}/users/export?format=json`, {
      headers: { 'Authorization': 'Bearer ' + nts_token }
    });
    
    if (!testResponse.ok) {
      showNotification('Немає прав доступу. Тільки адміністратор може переглядати деталі кешу', 'error');
      return;
    }
  } catch (error) {
    console.error('Помилка перевірки прав доступу:', error);
    showNotification('Помилка перевірки прав доступу', 'error');
    return;
  }
  
  try {
    const allData = await chrome.storage.local.get(null);
    let details = '📊 Деталі локального сховища:\n\n';
    let totalSize = 0;
    
    // Сортуємо за розміром
    const items = Object.entries(allData).map(([key, value]) => {
      const size = JSON.stringify(value).length;
      totalSize += size;
      return { key, value, size, formatted: formatBytes(size) };
    }).sort((a, b) => b.size - a.size);
    
    items.forEach(item => {
      let valuePreview;
      
      // Спеціальна обробка для токенів та конфіденційних даних
      if (item.key.includes('token') || item.key.includes('password') || item.key.includes('secret')) {
        const valueStr = typeof item.value === 'string' ? item.value : JSON.stringify(item.value);
        if (valueStr.length > 20) {
          valuePreview = valueStr.substring(0, 10) + '...' + valueStr.substring(valueStr.length - 10);
        } else {
          valuePreview = '***ПРИХОВАНО***';
        }
      } else {
        valuePreview = typeof item.value === 'string' 
          ? (item.value.length > 50 ? item.value.substring(0, 50) + '...' : item.value)
          : JSON.stringify(item.value).substring(0, 50) + (JSON.stringify(item.value).length > 50 ? '...' : '');
      }
      
      details += `🔑 ${item.key}: ${item.formatted}\n`;
      details += `   📝 ${valuePreview}\n\n`;
    });
    
    const maxStorage = 5 * 1024 * 1024; // 5MB
    const usagePercent = (totalSize / maxStorage) * 100;
    
    details += `\n📈 Загалом: ${formatBytes(totalSize)} / ${formatBytes(maxStorage)} (${items.length} елементів)`;
    details += `\n📊 Використання: ${Math.round(usagePercent * 100) / 100}%`;
    
    if (usagePercent > 95) {
      details += `\n🚨 КРИТИЧНО! Кеш майже повний!`;
    } else if (usagePercent > 80) {
      details += `\n⚠️ УВАГА! Кеш заповнений більш ніж на 80%`;
    }
    
    details += `\n\n💡 Поради:`;
    details += `\n• Очищайте стару історію транспорту`;
    details += `\n• Видаляйте непотрібні позначені фірми`;
    details += `\n• Максимум для розширення: 5 MB`;
    
    // Показуємо в alert (можна замінити на модальне вікно)
    alert(details);
    
  } catch (error) {
    console.error('Помилка отримання деталей storage:', error);
    showNotification('Помилка отримання деталей кешу', 'error');
  }
}

// === ТЕСТОВА ФУНКЦІЯ ===
async function testFunction() {
  try {
    const { nts_token } = await chrome.storage.local.get(['nts_token']);
    if (!nts_token) {
      showNotification('Потрібно увійти в систему', 'warning');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      showNotification(`Сервер працює! Статус: ${data.status}`, 'success');
    } else {
      showNotification('Сервер не відповідає', 'error');
    }
  } catch (error) {
    console.error('Помилка тесту:', error);
    showNotification('Помилка підключення', 'error');
  }
}

// === АВТОМАТИЧНИЙ LOGOUT ===
function startAutoLogout() {
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
  }
  
  autoLogoutTimer = setTimeout(() => {
    showNotification('Автоматичний вихід через 4 години', 'warning');
    performLogout();
  }, AUTO_LOGOUT_MS);
}

// === ПЕРЕЗАВАНТАЖЕННЯ СТОРІНКИ ===
function reloadCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
}

// Запуск таймера
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(() => {
    if (sessionStartTime) {
      // Обчислюємо час сесії від початку логіну
      secondsElapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    } else {
      secondsElapsed++;
    }
    
    timerDiv.textContent = formatTime(secondsElapsed);
    updateSessionStats();
  }, 1000);
  
  console.log("⏱️ Таймер запущено");
}

// Показати таймер після логіну
async function showTimerWindow() {
  loginWindow.style.display = 'none';
  timerWindow.style.display = 'block';
  
  // Отримуємо час початку сесії з storage (якщо ще не встановлено)
  if (!sessionStartTime) {
    const { nts_session_start } = await chrome.storage.local.get(['nts_session_start']);
    if (nts_session_start) {
      sessionStartTime = nts_session_start;
      console.log("⏱️ Відновлено час початку сесії з storage");
    }
  }
  
  // Обчислюємо поточний час сесії
  if (sessionStartTime) {
    secondsElapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    console.log(`⏱️ Поточний час сесії: ${formatTime(secondsElapsed)}`);
  }
  
  startTimer();
  startAutoLogout();
  
  // Завантажуємо статистику
  const stats = await loadUserStats();
  if (stats) {
    await displayUserInfo(stats);
  }
  
  // Перевіряємо статус сервера
  const serverOnline = await checkServerStatus();
  updateServerStatus(serverOnline);
  
  // Додаємо швидкі дії
  await addQuickActions();
  
  // Перевіряємо ліміти кешу
  checkStorageLimits();
}

// === ВІДОБРАЖЕННЯ ІНФОРМАЦІЇ ПРО КОРИСТУВАЧА ===
async function displayUserInfo(stats) {
  const userInfoContainer = document.getElementById('userInfo');
  if (!userInfoContainer) return;
  
  const { nts_user_id } = await chrome.storage.local.get(['nts_user_id']);
  
  userInfoContainer.innerHTML = `
    <div class="user-info">
      <div class="user-avatar">👤</div>
      <div class="user-details">
        <div class="user-name">${nts_user_id || 'Користувач'}</div>
        <div class="user-stats">
          <span class="stat">Всього користувачів: ${stats.totalUsers || 0}</span>
          <span class="stat">Адмінів: ${stats.adminCount || 0}</span>
        </div>
      </div>
    </div>
  `;
}

// === ОНОВЛЕННЯ СТАТУСУ СЕРВЕРА ===
function updateServerStatus(isOnline) {
  const serverStatusContainer = document.getElementById('serverStatus');
  if (!serverStatusContainer) return;
  
  serverStatusContainer.innerHTML = `
    <div class="server-status ${isOnline ? 'online' : 'offline'}">
      <div class="status-dot"></div>
      <span>Сервер ${isOnline ? 'онлайн' : 'офлайн'}</span>
    </div>
  `;
}

// === ВИКОНАННЯ LOGOUT ===
function performLogout() {
  // Видаляємо тільки токен та дані сесії, але зберігаємо дані для входу
  chrome.storage.local.remove(['nts_token', 'nts_user_id', 'nts_session_start']);
  clearInterval(timerInterval);
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
  }
  
  // Зупиняємо моніторинг токена
  PopupTokenMonitor.stop();
  
  secondsElapsed = 0;
  sessionStartTime = null;
  generateCount = 0;
  timerDiv.textContent = '00:00:00';
  timerWindow.style.display = 'none';
  loginWindow.style.display = 'block';
  
  // Перезавантажуємо поточну вкладку
  reloadCurrentTab();
  
  showNotification('Вихід виконано', 'info');
}

// === ЗБЕРЕЖЕННЯ ЧАСУ СЕСІЇ ===
async function saveSessionTime() {
  if (sessionStartTime) {
    await chrome.storage.local.set({ nts_session_start: sessionStartTime });
    console.log("💾 Час сесії збережено");
  }
}

// Зберігаємо час сесії при закритті popup
window.addEventListener('beforeunload', saveSessionTime);

// Logout
logoutBtn.addEventListener('click', performLogout);

// Test
testBtn.addEventListener('click', testFunction);

// Clear saved data
document.getElementById('clearSavedDataBtn').addEventListener('click', async () => {
  if (confirm('Ви впевнені, що хочете очистити збережені дані для входу?')) {
    await chrome.storage.local.remove(['nts_remember_me', 'nts_saved_username', 'nts_saved_password']);
    
    // Очищаємо поля форми
    document.getElementById('userId').value = '';
    document.getElementById('token').value = '';
    document.getElementById('rememberMe').checked = false;
    
    showNotification('Збережені дані очищено', 'info');
    console.log("🗑️ Збережені дані для входу очищено");
  }
});

// Login
loginBtn.addEventListener('click', async () => {
  const userId = document.getElementById('userId').value.trim();
  const token = document.getElementById('token').value.trim();
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!userId || !token) {
    showNotification('Заповніть обидва поля', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: userId, password: token })
    });
    
    const data = await response.json();
    console.log("📋 Дані логіну:", data);
    
    if(data.token) {
      console.log("💾 Зберігаємо токен в chrome.storage");
      const sessionStartTime = Date.now();
      
      // Зберігаємо дані для входу, якщо користувач вибрав "Запам'ятати мене"
      const storageData = { 
        nts_token: data.token, 
        nts_user_id: userId,
        nts_session_start: sessionStartTime
      };
      
      if (rememberMe) {
        storageData.nts_remember_me = true;
        storageData.nts_saved_username = userId;
        storageData.nts_saved_password = token;
        console.log("💾 Збережено дані для входу");
      } else {
        // Видаляємо збережені дані, якщо користувач не хоче їх зберігати
        await chrome.storage.local.remove(['nts_remember_me', 'nts_saved_username', 'nts_saved_password']);
        console.log("🗑️ Видалено збережені дані для входу");
      }
      
      await chrome.storage.local.set(storageData);
      console.log("✅ Токен та час сесії збережено успішно");
      
      // Перезавантажуємо поточну вкладку
      reloadCurrentTab();
      
      // Показуємо таймер
      await showTimerWindow();
      
      // Запускаємо моніторинг токена
      PopupTokenMonitor.start();
    } else {
      console.log("❌ Логін не вдався");
      showNotification('Невірні дані для входу', 'error');
    }
  } catch (err) {
    console.error("Помилка fetch:", err);
    showNotification('Помилка підключення до сервера', 'error');
  }
});

// === ІНІЦІАЛІЗАЦІЯ ===
async function initializePopup() {
  const { 
    nts_token, 
    nts_generate_count, 
    nts_session_start, 
    nts_remember_me, 
    nts_saved_username, 
    nts_saved_password 
  } = await chrome.storage.local.get([
    'nts_token', 
    'nts_generate_count', 
    'nts_session_start', 
    'nts_remember_me', 
    'nts_saved_username', 
    'nts_saved_password'
  ]);
  
  if (nts_token) {
    console.log("🔄 Токен вже є, показуємо таймер");
    generateCount = nts_generate_count || 0;
    
    // Встановлюємо час початку сесії з storage
    if (nts_session_start) {
      sessionStartTime = nts_session_start;
      secondsElapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      console.log(`⏱️ Відновлено сесію: ${formatTime(secondsElapsed)}`);
    }
    
    await showTimerWindow();
    
    // Запускаємо моніторинг токена
    PopupTokenMonitor.start();
  } else {
    console.log("🔑 Токен не знайдено, показуємо форму логіну");
    
    // Заповнюємо поля, якщо користувач раніше вибрав "Запам'ятати мене"
    if (nts_remember_me && nts_saved_username && nts_saved_password) {
      document.getElementById('userId').value = nts_saved_username;
      document.getElementById('token').value = nts_saved_password;
      document.getElementById('rememberMe').checked = true;
      console.log("💾 Заповнено збережені дані для входу");
    }
  }
}

// === АВТОМАТИЧНА ПЕРЕВІРКА ТОКЕНА ===
class PopupTokenMonitor {
  static checkInterval = null;
  
  static start() {
    // Запускаємо першу перевірку через 30 секунд після логіну
    setTimeout(() => {
      // Перевіряємо кожні 10 секунд
      this.checkInterval = setInterval(() => {
        this.checkTokenStatus();
      }, 10000);
      
      console.log("🔍 PopupTokenMonitor: Запущено автоматичну перевірку токена");
    }, 30000);
  }
  
  static stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("🛑 PopupTokenMonitor: Зупинено автоматичну перевірку токена");
    }
  }
  
  static async checkTokenStatus() {
    try {
      const { nts_token } = await chrome.storage.local.get(['nts_token']);
      if (!nts_token) {
        console.log("🔍 PopupTokenMonitor: Токен не знайдено");
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/token-status`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + nts_token }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.log("🔍 PopupTokenMonitor: Токен невалідний, виконуємо logout");
          performLogout();
        } else if (response.status === 404) {
          console.log("🔍 PopupTokenMonitor: Endpoint /token-status не знайдено, використовуємо /verify");
          // Fallback до /verify endpoint
          const verifyResponse = await fetch(`${API_BASE_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: nts_token })
          });
          
          if (!verifyResponse.ok) {
            console.log("🔍 PopupTokenMonitor: Токен невалідний через /verify");
            performLogout();
          } else {
            console.log("✅ PopupTokenMonitor: Токен валідний через /verify");
          }
        } else {
          console.log("🔍 PopupTokenMonitor: Помилка сервера, пропускаємо перевірку");
        }
      } else {
        console.log("✅ PopupTokenMonitor: Токен валідний");
      }
    } catch (error) {
      console.error("🔍 PopupTokenMonitor: Помилка перевірки токена:", error);
      // Не виконуємо logout при помилках мережі
    }
  }
}

// === СЛУХАЧ ЗМІН STORAGE ===
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Якщо токен був видалений (logout з адмін панелі)
    if (changes.nts_token && !changes.nts_token.newValue) {
      console.log("🔄 Popup: Токен видалено, виконуємо logout");
      performLogout();
    }
    
    // Оновлюємо лічильник generate
    if (changes.nts_generate_count) {
      generateCount = changes.nts_generate_count.newValue || 0;
      updateSessionStats();
    }
  }
});

// === АВТОМАТИЧНЕ ПЕРЕЗАВАНТАЖЕННЯ ПРИ ЗМІНІ ТОКЕНА ===
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.nts_token) {
    // Якщо токен був видалений (logout з адмін панелі)
    if (!changes.nts_token.newValue) {
      console.log("🔄 Popup: Токен видалено, перезавантажуємо вкладку");
      reloadCurrentTab();
    }
  }
});

// Ініціалізація при завантаженні
initializePopup();
