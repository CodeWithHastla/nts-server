# Команди для GitHub деплою

## Після створення репозиторію на GitHub:

### 1. Додати remote репозиторій
```bash
git remote add origin https://github.com/CodeWithHastla/nts-server.git
```
**ЗАМІНИ `CodeWithHastla` на свій GitHub username!**

### 2. Відправити код на GitHub
```bash
git push -u origin main
```

## Якщо репозиторій вже існує з файлами:

### 1. Додати remote
```bash
git remote add origin https://github.com/CodeWithHastla/nts-server.git
```

### 2. Отримати зміни з GitHub
```bash
git pull origin main --allow-unrelated-histories
```

### 3. Відправити зміни
```bash
git push origin main
```

## Перевірка статусу
```bash
git status
git remote -v
```

## Якщо виникнуть проблеми з авторизацією:

### Варіант 1: Personal Access Token
1. Перейди до GitHub → Settings → Developer settings → Personal access tokens
2. Створи новий token з правами `repo`
3. Використовуй token як пароль при push

### Варіант 2: SSH ключі
1. Створи SSH ключ: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Додай публічний ключ до GitHub
3. Використовуй SSH URL: `git@github.com:YOUR_USERNAME/nts-server.git`
