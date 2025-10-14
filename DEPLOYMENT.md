# Інструкції для розгортання NTS Server

## Передумови

### Системні вимоги
- **Node.js** версії 16.0.0 або вище
- **npm** версії 8.0.0 або вище
- **Git** для клонування репозиторію
- **Порти**: 3000 (або вказаний в PORT environment variable)

### Перевірка версій
```bash
node --version
npm --version
git --version
```

## Варіант 1: Розгортання з GitHub

### 1. Клонування репозиторію
```bash
# Клонувати репозиторій
git clone https://github.com/yourusername/nts-server.git
cd nts-server
```

### 2. Встановлення залежностей
```bash
# Встановити залежності
npm install

# Або використати скрипт setup
npm run setup
```

### 3. Налаштування environment variables
```bash
# Створити .env файл (опціонально)
echo "PORT=3000" > .env
echo "JWT_SECRET=your_super_secret_jwt_key_here" >> .env
echo "NODE_ENV=production" >> .env
```

### 4. Запуск сервера
```bash
# Development режим
npm run dev

# Production режим
npm run prod

# Або просто
npm start
```

## Варіант 2: Ручне розгортання

### 1. Створення директорії проекту
```bash
mkdir nts-server
cd nts-server
```

### 2. Копіювання файлів
Скопіювати всі файли проекту (крім `node_modules`, `database.db`, `backups/`)

### 3. Встановлення залежностей
```bash
npm install
```

### 4. Запуск
```bash
npm start
```

## Налаштування для production

### 1. Зміна JWT Secret
**ВАЖЛИВО**: Обов'язково змініть JWT_SECRET в production!

```bash
# Створити сильний секретний ключ
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Налаштування порту
```bash
# Встановити змінну середовища
export PORT=3000
# Або
set PORT=3000  # Windows
```

### 3. Налаштування NODE_ENV
```bash
export NODE_ENV=production
# Або
set NODE_ENV=production  # Windows
```

## Автоматичне запуск (Systemd для Linux)

### 1. Створити service файл
```bash
sudo nano /etc/systemd/system/nts-server.service
```

### 2. Додати конфігурацію
```ini
[Unit]
Description=NTS Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/nts-server
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=your_jwt_secret_here

[Install]
WantedBy=multi-user.target
```

### 3. Запустити сервіс
```bash
sudo systemctl daemon-reload
sudo systemctl enable nts-server
sudo systemctl start nts-server
sudo systemctl status nts-server
```

## Налаштування брандмауера

### Ubuntu/Debian (ufw)
```bash
sudo ufw allow 3000
sudo ufw enable
```

### CentOS/RHEL (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Налаштування nginx (опціонально)

### 1. Встановлення nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Конфігурація
```bash
sudo nano /etc/nginx/sites-available/nts-server
```

### 3. Додати конфігурацію
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Активувати сайт
```bash
sudo ln -s /etc/nginx/sites-available/nts-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Перевірка роботи

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Перевірка логів
```bash
# Якщо використовується systemd
sudo journalctl -u nts-server -f

# Або просто
tail -f server.log
```

## Backup та відновлення

### Створення backup
```bash
# Через API (потребує авторизації)
curl -X POST http://localhost:3000/backup \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ручний backup
cp database.db "backup_$(date +%Y%m%d_%H%M%S).db"
```

### Відновлення з backup
```bash
# Через API
curl -X POST http://localhost:3000/restore/backup_filename.db \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ручне відновлення
cp backup_file.db database.db
```

## Troubleshooting

### Порт зайнятий
```bash
# Знайти процес на порту 3000
sudo lsof -i :3000
# Або
sudo netstat -tulpn | grep :3000

# Вбити процес
sudo kill -9 PID
```

### Проблеми з правами
```bash
# Дати права на папку
chmod -R 755 /path/to/nts-server
chown -R your-username:your-username /path/to/nts-server
```

### Проблеми з базою даних
```bash
# Перевірити права на файл бази даних
ls -la database.db

# Відновити права
chmod 644 database.db
```

## Контактна інформація

При виникненні проблем звертайтесь до розробника або створюйте issue в GitHub репозиторії.
