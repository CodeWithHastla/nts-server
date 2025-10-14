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
    const date = new Date(backup.created).toLocaleString('uk-UA');
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
    const date = new Date(log.timestamp).toLocaleString('uk-UA');
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
    const createdDate = new Date(user.created_at).toLocaleDateString('uk-UA');
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
    tbody.innerHTML = '<tr><td colspan="5">Немає активних сесій</td></tr>';
    return;
  }
  
  sessions.forEach(session => {
    const tr = document.createElement('tr');
    const loginTime = new Date(session.login_time).toLocaleString('uk-UA');
    const lastActivity = new Date(session.last_activity).toLocaleString('uk-UA');
    
    tr.innerHTML = `
      <td>${session.username}</td>
      <td>
        <span class="tag-btn ${getTagClass(session.tag)}">
          ${session.tag || 'Без тегу'}
        </span>
      </td>
      <td>
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
