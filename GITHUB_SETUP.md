# Налаштування GitHub репозиторію для NTS Server

## Покрокова інструкція

### 1. Створення нового репозиторію на GitHub

1. Увійдіть на [GitHub.com](https://github.com)
2. Натисніть кнопку **"New"** або **"+"** → **"New repository"**
3. Заповніть дані:
   - **Repository name**: `nts-server`
   - **Description**: `NTS Server - Веб-додаток для управління користувачами з JWT автентифікацією`
   - **Visibility**: Private (рекомендовано для серверного коду)
   - **НЕ** додавайте README, .gitignore, або license (вони вже є)
4. Натисніть **"Create repository"**

### 2. Налаштування локального Git репозиторію

Відкрийте термінал в папці проекту (`C:\NTS_Server`) та виконайте:

```bash
# Ініціалізувати Git репозиторій
git init

# Додати всі файли (крім виключених в .gitignore)
git add .

# Створити перший коміт
git commit -m "Initial commit: NTS Server setup"

# Додати remote репозиторій (замініть YOUR_USERNAME на свій GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/nts-server.git

# Встановити основну гілку
git branch -M main

# Відправити код на GitHub
git push -u origin main
```

### 3. Налаштування SSH ключів (рекомендовано)

#### Створення SSH ключа:
```bash
# Генерувати новий SSH ключ (замініть на свій email)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Запустити ssh-agent
eval "$(ssh-agent -s)"

# Додати ключ до ssh-agent
ssh-add ~/.ssh/id_ed25519

# Показати публічний ключ для копіювання
cat ~/.ssh/id_ed25519.pub
```

#### Додавання ключа на GitHub:
1. Перейдіть до **Settings** → **SSH and GPG keys**
2. Натисніть **"New SSH key"**
3. Вставте скопійований ключ
4. Натисніть **"Add SSH key"**

#### Використання SSH URL:
```bash
# Замість HTTPS URL використовуйте SSH
git remote set-url origin git@github.com:YOUR_USERNAME/nts-server.git
```

### 4. Налаштування GitHub Actions (опціонально)

Створіть папку та файл для автоматичного деплою:

```bash
mkdir -p .github/workflows
```

Створіть файл `.github/workflows/deploy.yml`:
```yaml
name: Deploy NTS Server

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests (if any)
      run: npm test
    
    - name: Build check
      run: node -c server.js
```

### 5. Налаштування Secrets для Production

В GitHub репозиторії перейдіть до **Settings** → **Secrets and variables** → **Actions**:

Додайте наступні секрети:
- `JWT_SECRET`: ваш сильний JWT секрет
- `SERVER_HOST`: IP або домен сервера
- `SERVER_USER`: username для SSH підключення
- `SERVER_SSH_KEY`: приватний SSH ключ для сервера

### 6. Налаштування GitHub Pages (для документації)

1. Перейдіть до **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: main /docs folder
4. **Save**

### 7. Налаштування Branch Protection

1. Перейдіть до **Settings** → **Branches**
2. Натисніть **"Add rule"**
3. Налаштуйте:
   - **Branch name pattern**: main
   - **Require pull request reviews before merging**: ✓
   - **Require status checks to pass before merging**: ✓

### 8. Корисні GitHub функції

#### Issues та Project Management:
- Створюйте issues для багів та feature requests
- Використовуйте Projects для планування
- Додавайте Labels для категорізації

#### Releases:
1. Перейдіть до **Releases**
2. Натисніть **"Create a new release"**
3. Заповніть версію та опис
4. Додайте changelog

#### Wiki:
- Створюйте документацію в Wiki секції
- Додавайте API документацію
- Описуйте архітектуру системи

### 9. Команди для щоденної роботи

```bash
# Оновити локальний репозиторій
git pull origin main

# Додати зміни
git add .
git commit -m "Опис змін"

# Відправити зміни
git push origin main

# Створити нову гілку для feature
git checkout -b feature/new-feature
git push origin feature/new-feature

# Створити Pull Request через GitHub веб-інтерфейс
```

### 10. Налаштування .gitignore (вже створено)

Файл `.gitignore` вже створено та включає:
- `node_modules/`
- `database.db`
- `backups/`
- Environment files
- Log files
- IDE files
- OS files

### 11. Рекомендації з безпеки

#### Ніколи не додавайте до Git:
- Паролі та секрети
- Бази даних з реальними даними
- Приватні ключі
- Environment variables з секретами

#### Використовуйте:
- GitHub Secrets для CI/CD
- Environment variables на сервері
- .env файли (в .gitignore)
- Strong JWT secrets

### 12. Налаштування для команди

Якщо працюєте в команді:
1. Додайте співробітників до репозиторію
2. Налаштуйте права доступу
3. Використовуйте Pull Requests
4. Налаштуйте code review
5. Використовуйте Issues для планування

## Готово! 🎉

Ваш репозиторій готовий для перенесення на новий сервер. Використовуйте файл `DEPLOYMENT.md` для інструкцій з розгортання.
