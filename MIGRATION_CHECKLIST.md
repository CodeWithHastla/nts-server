# ✅ Чек-лист для перенесення NTS Server

## 📋 Перед перенесенням

### ✅ Підготовка завершена:
- [x] Створено `.gitignore` файл
- [x] Оновлено `package.json` з новими скриптами
- [x] Створено `DEPLOYMENT.md` з інструкціями
- [x] Створено `GITHUB_SETUP.md` з налаштуванням GitHub
- [x] Створено `environment.example` з прикладами змінних
- [x] Створено `prepare-for-deployment.bat` для перевірки
- [x] Оновлено `README.md`
- [x] Створено backup поточної бази даних

## 🚀 Покроковий план перенесення

### Крок 1: Налаштування GitHub репозиторію
1. **Створити репозиторій на GitHub**
   - Назва: `nts-server`
   - Тип: Private (рекомендовано)
   - НЕ додавати README, .gitignore, license

2. **Налаштувати локальний Git**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NTS Server setup"
   git remote add origin https://github.com/YOUR_USERNAME/nts-server.git
   git branch -M main
   git push -u origin main
   ```

### Крок 2: Підготовка нового сервера
1. **Встановити Node.js 16+**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   ```

2. **Встановити Git**
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install git
   
   # CentOS/RHEL
   sudo yum install git
   ```

### Крок 3: Розгортання на новому сервері
1. **Клонувати репозиторій**
   ```bash
   git clone https://github.com/YOUR_USERNAME/nts-server.git
   cd nts-server
   ```

2. **Встановити залежності**
   ```bash
   npm install
   ```

3. **Налаштувати environment variables**
   ```bash
   # Створити .env файл
   cp environment.example .env
   nano .env  # Відредагувати змінні
   ```

4. **Запустити сервер**
   ```bash
   npm start
   ```

### Крок 4: Налаштування автозапуску (опціонально)
1. **Створити systemd service**
   ```bash
   sudo nano /etc/systemd/system/nts-server.service
   ```

2. **Додати конфігурацію з DEPLOYMENT.md**

3. **Запустити сервіс**
   ```bash
   sudo systemctl enable nts-server
   sudo systemctl start nts-server
   ```

## 🔐 Безпека

### ✅ Обов'язково змінити:
- [ ] JWT_SECRET на сильний ключ
- [ ] Пароль Admin користувача
- [ ] Налаштувати firewall
- [ ] Налаштувати HTTPS (опціонально)

### 🔑 Генерація сильного JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📊 Перевірка роботи

### ✅ Тести після розгортання:
- [ ] Health check: `curl http://localhost:3000/health`
- [ ] Логін Admin користувача
- [ ] Створення нового користувача
- [ ] Backup бази даних
- [ ] Логи сервера

## 🆘 Troubleshooting

### Проблеми з портом:
```bash
# Перевірити чи зайнятий порт
sudo lsof -i :3000
# Вбити процес
sudo kill -9 PID
```

### Проблеми з правами:
```bash
# Дати права на папку
chmod -R 755 /path/to/nts-server
chown -R username:username /path/to/nts-server
```

### Проблеми з базою даних:
```bash
# Перевірити права на файл
ls -la database.db
# Відновити права
chmod 644 database.db
```

## 📞 Підтримка

Якщо виникли проблеми:
1. Перевірте логи сервера
2. Перевірте статус systemd service
3. Перевірте конфігурацію
4. Створіть issue в GitHub репозиторії

## 🎯 Рекомендації для production

1. **Використовуйте nginx** як reverse proxy
2. **Налаштуйте HTTPS** з Let's Encrypt
3. **Встановіть PM2** для управління процесами
4. **Налаштуйте моніторинг** (опціонально)
5. **Регулярно створюйте backups**

---

## ✅ Готово до перенесення!

Ваш проект повністю підготовлений для перенесення через GitHub. Слідуйте інструкціям у файлах `GITHUB_SETUP.md` та `DEPLOYMENT.md` для детального розгортання.
