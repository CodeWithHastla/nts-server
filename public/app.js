// === ФУНКЦІЇ ФОРМАТУВАННЯ ДАТ ДЛЯ ПОЛЬЩІ ===
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

// Статус сервера
let serverOnline = true;

// Перевірка статусу сервера
async function checkServerStatus() {
  try {
    const res = await fetch('/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) // таймаут 5 секунд
    });
    
    if (res.ok) {
      serverOnline = true;
      return true;
    } else {
      serverOnline = false;
      return false;
    }
  } catch (err) {
    console.error('Server status check failed:', err);
    serverOnline = false;
    return false;
  }
}

// Валідація форм
function validateForm(formData) {
  const errors = [];
  
  if (!formData.username || formData.username.trim().length < 3) {
    errors.push('Ім\'я користувача має бути не менше 3 символів');
  }
  
  if (!formData.password || formData.password.length < 5) {
    errors.push('Пароль має бути не менше 5 символів');
  }
  
  return errors;
}

// Показ повідомлень про помилки
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.className = 'error-message';
  }
}

// Очищення повідомлень
function clearMessage(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.className = '';
  }
}

// Логін
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage('message');
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // Валідація
    const validationErrors = validateForm({ username, password });
    if (validationErrors.length > 0) {
      showError('message', validationErrors.join(', '));
      return;
    }

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
      } else {
        if (data.errors) {
          showError('message', data.errors.join(', '));
        } else {
          showError('message', data.message || 'Помилка входу');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      showError('message', 'Помилка з\'єднання з сервером');
    }
  });
}

// Dashboard
const welcomeMessage = document.getElementById('welcomeMessage');
const logoutBtn = document.getElementById('logoutBtn');

if (welcomeMessage) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
  } else {
    fetch('/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
      if (data.valid) {
        welcomeMessage.textContent = `Ласкаво просимо, ${data.user || 'Admin'}! Це ваша панель керування.`;
        // Ініціалізуємо всі функції панелі керування
        initializeSearch();
        initializeBulkOperations();
        initializeAnalytics();
        initializeSystemManagement();
        initializeSessions();
        initializeSecurity();
        // Завантажуємо список користувачів
        loadUsers();
      } else {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
      }
    })
    .catch(err => {
      console.error('Token verification error:', err);
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    });
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    const token = localStorage.getItem('token');
    if (token) {
      // Відправити запит на відкликання токена
      fetch('/logout-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).catch(err => console.error('Logout error:', err));
    }
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
}

// Функції для управління користувачами
let token = '';
let currentPage = 1;
let paginationData = {};

// Отримуємо токен при завантаженні сторінки
if (typeof localStorage !== 'undefined') {
  token = localStorage.getItem('token') || '';
}

// Завантаження списку користувачів з пагінацією
async function loadUsers(page = 1) {
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5">Завантаження...</td></tr>';
  
  try {
    const res = await fetch(`/users?page=${page}&limit=10`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) {
      throw new Error('Не вдалося завантажити користувачів');
    }
    
    const data = await res.json();
    const users = data.users;
    paginationData = data.pagination;
    currentPage = page;
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Користувачів не знайдено</td></tr>';
      return;
    }
    
    displayUsers(users);
    
    updatePagination();
  } catch (err) {
    console.error('Error loading users:', err);
    tbody.innerHTML = '<tr><td colspan="5">Помилка завантаження користувачів</td></tr>';
  }
}

// Оновлення пагінації
function updatePagination() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInfo = document.getElementById('pageInfo');
  
  if (prevBtn && nextBtn && pageInfo) {
    prevBtn.disabled = !paginationData.hasPrev;
    nextBtn.disabled = !paginationData.hasNext;
    pageInfo.textContent = `Сторінка ${paginationData.currentPage} з ${paginationData.totalPages} (${paginationData.totalUsers} користувачів)`;
  }
}

// Отримання CSS класу для тегу
function getTagClass(tag) {
  if (!tag) return 'tag-none';
  return `tag-${tag.toLowerCase()}`;
}

// Зміна тегу користувача
async function changeTag(username, currentTag) {
  const validTags = ['RZ', 'LB', 'KR'];
  let newTag;
  
  // Циклічне перемикання тегів
  if (!currentTag) {
    newTag = 'RZ';
  } else if (currentTag === 'RZ') {
    newTag = 'LB';
  } else if (currentTag === 'LB') {
    newTag = 'KR';
  } else if (currentTag === 'KR') {
    newTag = null; // Без тегу
  }
  
  try {
    const res = await fetch(`/users/${username}/tag`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ tag: newTag })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Перезавантажуємо поточну сторінку
      loadUsers(currentPage);
    } else {
      alert(data.message || 'Помилка оновлення тегу');
    }
  } catch (err) {
    console.error('Change tag error:', err);
    alert('Помилка з\'єднання з сервером');
  }
}

// Додавання користувача
const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
  addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const tag = document.getElementById('newUserTag').value;
    const isAdmin = document.getElementById('newUserRole').value === '1';
    const msgElement = document.getElementById('addUserMsg');
    
    // Валідація
    const validationErrors = validateForm({ username, password });
    if (validationErrors.length > 0) {
      showError('addUserMsg', validationErrors.join(', '));
      return;
    }
    
    if (!tag) {
      showError('addUserMsg', 'Оберіть тег для користувача');
      return;
    }
    
    try {
      const res = await fetch('/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ 
          username, 
          password, 
          tag,
          is_admin: isAdmin
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        msgElement.textContent = data.message || 'Користувач успішно доданий';
        msgElement.className = 'success-message';
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('newUserTag').value = '';
        document.getElementById('newUserRole').value = '0';
        loadUsers(); // Перезавантажуємо список
      } else {
        if (data.errors) {
          showError('addUserMsg', data.errors.join(', '));
        } else {
          showError('addUserMsg', data.message || 'Помилка додавання користувача');
        }
      }
    } catch (err) {
      console.error('Add user error:', err);
      showError('addUserMsg', 'Помилка з\'єднання з сервером');
    }
  });
}

// Видалення користувача
async function deleteUser(username) {
  if (!confirm(`Ви впевнені, що хочете видалити користувача "${username}"?`)) {
    return;
  }
  
  try {
    const res = await fetch(`/users/${username}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message || 'Користувач успішно видалений');
      loadUsers(); // Перезавантажуємо список
    } else {
      alert(data.message || 'Помилка видалення користувача');
    }
  } catch (err) {
    console.error('Delete user error:', err);
    alert('Помилка з\'єднання з сервером');
  }
}

// Обробники пагінації
document.addEventListener('DOMContentLoaded', function() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (paginationData.hasPrev) {
        loadUsers(currentPage - 1);
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (paginationData.hasNext) {
        loadUsers(currentPage + 1);
      }
    });
  }
});

// === ПОШУК ТА ФІЛЬТРАЦІЯ ===
function initializeSearch() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const tagFilter = document.getElementById('tagFilter');
  const sortBy = document.getElementById('sortBy');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }
  
  if (tagFilter) {
    tagFilter.addEventListener('change', performSearch);
  }
  
  if (sortBy) {
    sortBy.addEventListener('change', performSearch);
    
    const sortOrder = document.getElementById('sortOrder');
    if (sortOrder) {
      sortOrder.addEventListener('change', performSearch);
    }
  }
}

async function performSearch() {
  const searchInput = document.getElementById('searchInput');
  const tagFilter = document.getElementById('tagFilter');
  const sortBy = document.getElementById('sortBy');
  
  const sortOrderSelect = document.getElementById('sortOrder');
  const params = new URLSearchParams({
    q: searchInput?.value || '',
    tag: tagFilter?.value || '',
    sortBy: sortBy?.value || 'created_at',
    sortOrder: sortOrderSelect?.value || 'ASC',
    page: 1,
    limit: 10
  });
  
  try {
    const res = await fetch(`/users/search?${params}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка пошуку');
    
    const data = await res.json();
    displayUsers(data.users);
    updatePagination(data.pagination);
  } catch (err) {
    console.error('Search error:', err);
    alert('Помилка пошуку користувачів');
  }
}

// === МАСОВІ ОПЕРАЦІЇ ===
function initializeBulkOperations() {
  const selectAllBtn = document.getElementById('selectAllBtn');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const bulkTagBtn = document.getElementById('bulkTagBtn');
  
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', toggleSelectAll);
  }
  
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
  }
  
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', performBulkDelete);
  }
  
  if (bulkTagBtn) {
    bulkTagBtn.addEventListener('click', performBulkTagUpdate);
  }
}

function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-username]');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const isChecked = selectAllCheckbox.checked;
  
  checkboxes.forEach(cb => cb.checked = isChecked);
}

function getSelectedUsers() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-username]:checked');
  return Array.from(checkboxes).map(cb => cb.dataset.username);
}

async function performBulkDelete() {
  const selectedUsers = getSelectedUsers();
  if (selectedUsers.length === 0) {
    alert('Виберіть користувачів для видалення');
    return;
  }
  
  if (!confirm(`Видалити ${selectedUsers.length} користувачів?`)) return;
  
  try {
    const res = await fetch('/users/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        action: 'delete',
        usernames: selectedUsers
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadUsers(currentPage);
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Bulk delete error:', err);
    alert('Помилка масового видалення користувачів');
  }
}

async function performBulkTagUpdate() {
  const selectedUsers = getSelectedUsers();
  const bulkTagSelect = document.getElementById('bulkTagSelect');
  
  if (selectedUsers.length === 0) {
    alert('Виберіть користувачів для оновлення тегу');
    return;
  }
  
  if (!bulkTagSelect.value) {
    alert('Виберіть тег');
    return;
  }
  
  try {
    const res = await fetch('/users/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        action: 'update_tag',
        usernames: selectedUsers,
        tag: bulkTagSelect.value
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadUsers(currentPage);
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Bulk tag update error:', err);
    alert('Помилка масового оновлення тегів');
  }
}

// === АНАЛІТИКА ===
function initializeAnalytics() {
  loadStats();
  
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => exportData('csv'));
  }
  
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => exportData('json'));
  }
}

async function loadStats() {
  try {
    const res = await fetch('/stats', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) {
      throw new Error('Помилка завантаження статистики');
    }
    
    const stats = await res.json();
    displayStats(stats);
  } catch (err) {
    console.error('Stats error:', err);
    
    const totalStatsDiv = document.getElementById('totalStats');
    const tagStatsDiv = document.getElementById('tagStats');
    
    if (totalStatsDiv) {
      totalStatsDiv.innerHTML = '<div class="stat-item"><span>❌ Помилка завантаження статистики</span></div>';
    }
    if (tagStatsDiv) {
      tagStatsDiv.innerHTML = '<p>❌ Помилка завантаження статистики</p>';
    }
    
    // Оновлюємо статус сервера при помилці
    await checkServerStatus();
  }
}

function displayStats(stats) {
  const totalStatsDiv = document.getElementById('totalStats');
  const tagStatsDiv = document.getElementById('tagStats');
  
  if (totalStatsDiv) {
    totalStatsDiv.innerHTML = `
      <div class="stat-item">
        <span>Всього користувачів:</span>
        <span class="stat-value">${stats.totalUsers}</span>
      </div>
      <div class="stat-item">
        <span>Адміністраторів:</span>
        <span class="stat-value">${stats.adminCount}</span>
      </div>
    `;
  }
  
  if (tagStatsDiv) {
    let tagHtml = '';
    stats.tagDistribution.forEach(tag => {
      tagHtml += `
        <div class="stat-item">
          <span>${tag.tag}:</span>
          <span class="stat-value">${tag.count}</span>
        </div>
      `;
    });
    tagStatsDiv.innerHTML = tagHtml || '<p>Немає тегів</p>';
  }
}

async function exportData(format) {
  try {
    const res = await fetch(`/users/export?format=${format}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка експорту');
    
    if (format === 'csv') {
      const blob = new Blob([await res.text()], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.json';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Export error:', err);
    alert('Помилка експорту даних');
  }
}

// === СИСТЕМНЕ УПРАВЛІННЯ ===
function initializeSystemManagement() {
  const createBackupBtn = document.getElementById('createBackupBtn');
  const viewLogsBtn = document.getElementById('viewLogsBtn');
  
  if (createBackupBtn) {
    createBackupBtn.addEventListener('click', createBackup);
  }
  
  if (viewLogsBtn) {
    viewLogsBtn.addEventListener('click', toggleLogs);
  }
  
  loadBackups();
}

async function createBackup() {
  try {
    const res = await fetch('/backup', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadBackups();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Backup error:', err);
    alert('Помилка створення backup');
  }
}

async function loadBackups() {
  try {
    const res = await fetch('/backups', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка завантаження backup');
    
    const data = await res.json();
    displayBackups(data.backups);
  } catch (err) {
    console.error('Load backups error:', err);
    const backupListDiv = document.getElementById('backupList');
    if (backupListDiv) {
      backupListDiv.innerHTML = '<p>❌ Помилка завантаження backup файлів</p>';
    }
  }
}

function displayBackups(backups) {
  const backupListDiv = document.getElementById('backupList');
  
  if (!backupListDiv) return;
  
  if (backups.length === 0) {
    backupListDiv.innerHTML = '<p>Backup файлів не знайдено</p>';
    return;
  }
  
  let html = '';
  backups.forEach(backup => {
    const date = formatDateTimeForPoland(backup.created);
    const sizeKB = Math.round(backup.size / 1024);
    
    html += `
      <div class="backup-item">
        <div>
          <strong>${backup.filename}</strong><br>
          <small>${date} (${sizeKB} KB)</small>
        </div>
        <button class="restore-btn" onclick="restoreBackup('${backup.filename}')">
          Відновити
        </button>
      </div>
    `;
  });
  
  backupListDiv.innerHTML = html;
}

async function restoreBackup(filename) {
  if (!confirm(`Відновити базу даних з ${filename}?`)) return;
  
  try {
    const res = await fetch(`/restore/${filename}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadBackups();
      loadUsers(currentPage); // Перезавантажуємо користувачів
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Restore error:', err);
    alert('Помилка відновлення бази даних');
  }
}

async function toggleLogs() {
  const logsContainer = document.getElementById('logsContainer');
  const logsContent = document.getElementById('logsContent');
  
  if (logsContainer.style.display === 'none') {
    try {
      const res = await fetch('/logs', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (!res.ok) throw new Error('Помилка завантаження логів');
      
      const data = await res.json();
      displayLogs(data.logs);
      logsContainer.style.display = 'block';
    } catch (err) {
      console.error('Logs error:', err);
      logsContent.innerHTML = '<p>❌ Помилка завантаження логів</p>';
      logsContainer.style.display = 'block';
    }
  } else {
    logsContainer.style.display = 'none';
  }
}

function displayLogs(logs) {
  const logsContent = document.getElementById('logsContent');
  
  if (!logsContent) return;
  
  if (logs.length === 0) {
    logsContent.innerHTML = '<p>Логів не знайдено</p>';
    return;
  }
  
  let html = '';
  logs.forEach(log => {
    const date = log.timestamp_formatted || formatDateTimeForPoland(log.timestamp);
    html += `
      <div class="log-entry log-level-${log.level}">
        [${date}] ${log.level.toUpperCase()}: ${log.message}
        ${log.user ? ` (${log.user})` : ''}
      </div>
    `;
  });
  
  logsContent.innerHTML = html;
}

// === ОНОВЛЕНА ФУНКЦІЯ ВІДОБРАЖЕННЯ КОРИСТУВАЧІВ ===
function displayUsers(users) {
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">Користувачів не знайдено</td></tr>';
    return;
  }
  
  users.forEach((user, index) => {
    const tr = document.createElement('tr');
<<<<<<< HEAD
    const createdDate = new Date(user.created_at).toLocaleDateString('uk-UA');
=======
    const createdDate = user.created_at_formatted || formatDateForPoland(user.created_at);
>>>>>>> 3a26729 (Update NTS Server)
    const rowNumber = (currentPage - 1) * 10 + index + 1; // Номер рядка по порядку
    
    console.log(`👤 User ${user.username}: is_admin = ${user.is_admin}`);
    
    tr.innerHTML = `
      <td>
        ${user.username !== 'Admin' ? 
          `<input type="checkbox" data-username="${user.username}">` : 
          ''
        }
      </td>
      <td>${rowNumber}</td>
      <td>${user.username}</td>
      <td>
        <div class="tag-container">
          <button class="tag-btn ${getTagClass(user.tag)}" onclick="changeTag('${user.username}', '${user.tag || ''}')">
            ${user.tag || 'Без тегу'}
          </button>
        </div>
      </td>
      <td>
        <span class="status-badge ${user.is_admin ? 'admin' : 'user'}">
          ${user.is_admin ? '👑 Адмін' : '👤 Користувач'}
        </span>
      </td>
      <td>${createdDate}</td>
      <td>
        <div class="action-buttons">
          ${user.username !== 'Admin' ? 
            `<button class="admin-btn ${user.is_admin ? 'revoke' : 'grant'}" onclick="toggleAdminRights('${user.username}', ${user.is_admin})">
              ${user.is_admin ? '❌ Відкликати адмін' : '👑 Надати адмін'}
            </button>
            <button class="delete-btn" onclick="deleteUser('${user.username}')">Видалити</button>` : 
            '<span style="color: #6c757d;">Головний адмін</span>'
          }
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// === УПРАВЛІННЯ АДМІН ПРАВАМИ ===
window.toggleAdminRights = async function toggleAdminRights(username, currentStatus) {
  console.log('🔐 toggleAdminRights called for:', username, 'currentStatus:', currentStatus);
  const newStatus = !currentStatus;
  const action = newStatus ? 'надати' : 'відкликати';
  
  if (!confirm(`Ви впевнені, що хочете ${action} адмін права користувачу "${username}"?`)) {
    console.log('❌ User cancelled admin rights toggle');
    return;
  }
  
  try {
    console.log(`🔐 Toggling admin rights for ${username} to ${newStatus}`);
    console.log(`📡 Making request to: /users/${username}/admin`);
    
    const res = await fetch(`/users/${username}/admin`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ is_admin: newStatus })
    });
    
    console.log(`📡 Response status: ${res.status}`);
    console.log(`📡 Response ok: ${res.ok}`);
    
    const data = await res.json();
    console.log(`📡 Response data:`, data);
    
    if (res.ok) {
      alert(data.message);
      console.log('✅ Admin rights updated successfully, reloading users...');
      // Перезавантажуємо поточну сторінку
      loadUsers(currentPage);
    } else {
      console.log('❌ Admin rights update failed:', data.message);
      alert(data.message || 'Помилка зміни адмін прав');
    }
  } catch (err) {
    console.error('💥 Toggle admin rights error:', err);
    alert('Помилка з\'єднання з сервером');
  }
}

// === УПРАВЛІННЯ СЕСІЯМИ ===
function initializeSessions() {
  const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
  const cleanupSessionsBtn = document.getElementById('cleanupSessionsBtn');
  const logoutAllBtn = document.getElementById('logoutAllBtn');
  
  if (refreshSessionsBtn) {
    refreshSessionsBtn.addEventListener('click', loadSessions);
  }
  
  if (cleanupSessionsBtn) {
    cleanupSessionsBtn.addEventListener('click', cleanupOldSessions);
  }
  
  if (logoutAllBtn) {
    logoutAllBtn.addEventListener('click', logoutAllUsers);
  }
  
  // Завантажуємо сесії при ініціалізації
  loadSessions();
}

async function loadSessions() {
  try {
    const res = await fetch('/sessions', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка завантаження сесій');
    
    const data = await res.json();
    displaySessions(data.sessions);
  } catch (err) {
    console.error('Sessions error:', err);
    const tbody = document.getElementById('sessionsTable');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5">❌ Помилка завантаження сесій</td></tr>';
    }
  }
}

function displaySessions(sessions) {
  const tbody = document.getElementById('sessionsTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (sessions.length === 0) {
<<<<<<< HEAD
    tbody.innerHTML = '<tr><td colspan="5">Немає активних сесій</td></tr>';
=======
    tbody.innerHTML = '<tr><td colspan="7">Немає активних сесій</td></tr>';
>>>>>>> 3a26729 (Update NTS Server)
    return;
  }
  
  sessions.forEach(session => {
    const tr = document.createElement('tr');
<<<<<<< HEAD
    const loginTime = new Date(session.login_time).toLocaleString('uk-UA');
    const lastActivity = new Date(session.last_activity).toLocaleString('uk-UA');
=======
    const loginTime = session.login_time_formatted || formatDateTimeForPoland(session.login_time);
    const lastActivity = session.last_activity_formatted || formatDateTimeForPoland(session.last_activity);
    
    // Форматуємо локацію
    const location = session.location || `${session.city || 'Unknown'}, ${session.country || 'Unknown'}`;
>>>>>>> 3a26729 (Update NTS Server)
    
    tr.innerHTML = `
      <td>${session.username}</td>
      <td>
        <span class="tag-btn ${getTagClass(session.tag)}">
          ${session.tag || 'Без тегу'}
        </span>
      </td>
      <td>
<<<<<<< HEAD
=======
        <span class="ip-address" title="${session.user_agent || ''}">${session.ip || 'Unknown'}</span>
      </td>
      <td>
        <span class="location" title="Часовий пояс: ${session.timezone || 'Unknown'}">${location}</span>
      </td>
      <td>
>>>>>>> 3a26729 (Update NTS Server)
        <span class="status-online">🟢 Онлайн</span>
      </td>
      <td>${lastActivity}</td>
      <td>
        <button class="logout-user-btn" onclick="logoutUser('${session.username}')">
          Вилогувати
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
<<<<<<< HEAD
=======
  
  // Оновлюємо час останнього оновлення
  const lastUpdateDiv = document.getElementById('lastUpdate');
  if (lastUpdateDiv) {
    lastUpdateDiv.textContent = `Останнє оновлення: ${formatDateTimeForPoland(new Date().toISOString())}`;
  }
>>>>>>> 3a26729 (Update NTS Server)
}

window.logoutUser = async function logoutUser(username) {
  if (!confirm(`Вилогувати користувача "${username}"?`)) return;
  
  try {
    const res = await fetch(`/sessions/logout/${username}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadSessions(); // Перезавантажуємо список сесій
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Logout user error:', err);
    alert('Помилка вилогування користувача');
  }
}

window.logoutAllUsers = async function logoutAllUsers() {
  if (!confirm('Вилогувати ВСІХ користувачів? Це дія не може бути скасована.')) return;
  
  try {
    const res = await fetch('/sessions/logout-all', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadSessions(); // Перезавантажуємо список сесій
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Logout all error:', err);
    alert('Помилка масового вилогування користувачів');
  }
}

async function cleanupOldSessions() {
  if (!confirm('Очистити старі сесії (старше 24 годин)?')) return;
  
  try {
    const res = await fetch('/sessions/cleanup', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(`✅ ${data.message}`);
      loadSessions(); // Оновлюємо список сесій
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Cleanup sessions error:', err);
    alert('Помилка очищення старих сесій');
  }
}
// === ФУНКЦІЇ БЕЗПЕКИ ===
function initializeSecurity() {
  // Завантажуємо статистику безпеки
  loadSecurityStats();
  
  // Завантажуємо дозволені IP
  loadAllowedIPs();
  
  // Завантажуємо заблоковані IP
  loadBlockedIPs();
  
  // Додаємо обробники подій
  const addAllowedIPBtn = document.getElementById('addAllowedIPBtn');
  const addBlockedIPBtn = document.getElementById('addBlockedIPBtn');
  
  if (addAllowedIPBtn) {
    addAllowedIPBtn.addEventListener('click', addAllowedIP);
  }
  
  if (addBlockedIPBtn) {
    addBlockedIPBtn.addEventListener('click', addBlockedIP);
  }
}

// Завантаження статистики безпеки
async function loadSecurityStats() {
  try {
    const res = await fetch('/security/stats', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка завантаження статистики безпеки');
    
    const stats = await res.json();
    displaySecurityStats(stats);
  } catch (err) {
    console.error('Security stats error:', err);
    const statsDiv = document.getElementById('securityStats');
    if (statsDiv) {
      statsDiv.innerHTML = '<p>❌ Помилка завантаження статистики безпеки</p>';
    }
  }
}

// Відображення статистики безпеки
function displaySecurityStats(stats) {
  const statsDiv = document.getElementById('securityStats');
  if (!statsDiv) return;
  
  let html = `
    <div class="security-stats-grid">
      <div class="stat-item">
        <span>Дозволених IP:</span>
        <span class="stat-value">${stats.allowedIPs}</span>
      </div>
      <div class="stat-item">
        <span>Заблокованих IP:</span>
        <span class="stat-value">${stats.blockedIPs}</span>
      </div>
    </div>
  `;
  
  if (stats.countryDistribution && stats.countryDistribution.length > 0) {
    html += '<h5>Активність по країнах:</h5><div class="country-stats">';
    stats.countryDistribution.forEach(country => {
      html += `
        <div class="country-item">
          <span>${country.country}:</span>
          <span class="stat-value">${country.count}</span>
        </div>
      `;
    });
    html += '</div>';
  }
  
  if (stats.topIPs && stats.topIPs.length > 0) {
    html += '<h5>Топ IP адреси:</h5><div class="top-ips">';
    stats.topIPs.forEach(ip => {
      html += `
        <div class="ip-item">
          <span>${ip.ip} (${ip.country}, ${ip.city}):</span>
          <span class="stat-value">${ip.login_count} входів</span>
        </div>
      `;
    });
    html += '</div>';
  }
  
  statsDiv.innerHTML = html;
}

// Завантаження дозволених IP
async function loadAllowedIPs() {
  try {
    const res = await fetch('/security/allowed-ips', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка завантаження дозволених IP');
    
    const data = await res.json();
    displayAllowedIPs(data.allowedIPs);
  } catch (err) {
    console.error('Load allowed IPs error:', err);
    const tbody = document.getElementById('allowedIPsTable');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4">❌ Помилка завантаження дозволених IP</td></tr>';
    }
  }
}

// Відображення дозволених IP
function displayAllowedIPs(ips) {
  const tbody = document.getElementById('allowedIPsTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (ips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Дозволених IP адрес не знайдено</td></tr>';
    return;
  }
  
  ips.forEach(ip => {
    const tr = document.createElement('tr');
    const createdDate = ip.created_at_formatted || formatDateForPoland(ip.created_at);
    
    tr.innerHTML = `
      <td>${ip.ip_address}</td>
      <td>${ip.description || '-'}</td>
      <td>${createdDate}</td>
      <td>
        <button class="delete-btn" onclick="removeAllowedIP(${ip.id})">
          Видалити
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Додавання дозволеного IP
async function addAllowedIP() {
  const ipInput = document.getElementById('newAllowedIP');
  const descInput = document.getElementById('newAllowedIPDesc');
  
  const ip = ipInput.value.trim();
  const description = descInput.value.trim();
  
  if (!ip) {
    alert('Введіть IP адресу');
    return;
  }
  
  // Проста валідація IP
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    alert('Введіть коректну IP адресу');
    return;
  }
  
  try {
    const res = await fetch('/security/allowed-ips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        ip_address: ip,
        description: description
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      ipInput.value = '';
      descInput.value = '';
      loadAllowedIPs(); // Перезавантажуємо список
      loadSecurityStats(); // Оновлюємо статистику
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Add allowed IP error:', err);
    alert('Помилка додавання IP адреси');
  }
}

// Видалення дозволеного IP
window.removeAllowedIP = async function removeAllowedIP(id) {
  if (!confirm('Видалити цю IP адресу з дозволених?')) return;
  
  try {
    const res = await fetch(`/security/allowed-ips/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadAllowedIPs(); // Перезавантажуємо список
      loadSecurityStats(); // Оновлюємо статистику
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Remove allowed IP error:', err);
    alert('Помилка видалення IP адреси');
  }
}

// Завантаження заблокованих IP
async function loadBlockedIPs() {
  try {
    const res = await fetch('/security/blocked-ips', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!res.ok) throw new Error('Помилка завантаження заблокованих IP');
    
    const data = await res.json();
    displayBlockedIPs(data.blockedIPs);
  } catch (err) {
    console.error('Load blocked IPs error:', err);
    const tbody = document.getElementById('blockedIPsTable');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5">❌ Помилка завантаження заблокованих IP</td></tr>';
    }
  }
}

// Відображення заблокованих IP
function displayBlockedIPs(ips) {
  const tbody = document.getElementById('blockedIPsTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (ips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">Заблокованих IP адрес не знайдено</td></tr>';
    return;
  }
  
  ips.forEach(ip => {
    const tr = document.createElement('tr');
    const blockedDate = ip.blocked_at_formatted || formatDateForPoland(ip.blocked_at);
    
    tr.innerHTML = `
      <td>${ip.ip_address}</td>
      <td>${ip.reason || '-'}</td>
      <td>${blockedDate}</td>
      <td>${ip.blocked_by || '-'}</td>
      <td>
        <button class="unblock-btn" onclick="removeBlockedIP(${ip.id})">
          Розблокувати
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Додавання заблокованого IP
async function addBlockedIP() {
  const ipInput = document.getElementById('newBlockedIP');
  const reasonInput = document.getElementById('newBlockedIPReason');
  
  const ip = ipInput.value.trim();
  const reason = reasonInput.value.trim();
  
  if (!ip) {
    alert('Введіть IP адресу');
    return;
  }
  
  // Проста валідація IP
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    alert('Введіть коректну IP адресу');
    return;
  }
  
  if (!reason) {
    alert('Введіть причину блокування');
    return;
  }
  
  if (!confirm(`Заблокувати IP адресу ${ip}?\nПричина: ${reason}`)) return;
  
  try {
    const res = await fetch('/security/blocked-ips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        ip_address: ip,
        reason: reason
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      ipInput.value = '';
      reasonInput.value = '';
      loadBlockedIPs(); // Перезавантажуємо список
      loadSecurityStats(); // Оновлюємо статистику
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Add blocked IP error:', err);
    alert('Помилка блокування IP адреси');
  }
}

// Розблокування IP
window.removeBlockedIP = async function removeBlockedIP(id) {
  if (!confirm('Розблокувати цю IP адресу?')) return;
  
  try {
    const res = await fetch(`/security/blocked-ips/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadBlockedIPs(); // Перезавантажуємо список
      loadSecurityStats(); // Оновлюємо статистику
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Remove blocked IP error:', err);
    alert('Помилка розблокування IP адреси');
  }
}
>>>>>>> 3a26729 (Update NTS Server)
