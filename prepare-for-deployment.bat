@echo off
echo ========================================
echo    NTS Server - Підготовка до деплою
echo ========================================
echo.

echo [1/6] Створення backup поточної бази даних...
if exist database.db (
    set timestamp=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set timestamp=%timestamp: =0%
    copy database.db "backup_before_deploy_%timestamp%.db"
    echo ✅ Backup створено: backup_before_deploy_%timestamp%.db
) else (
    echo ⚠️  База даних не знайдена, пропускаємо backup
)

echo.
echo [2/6] Перевірка Node.js версії...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js не встановлений або не в PATH
    echo Встановіть Node.js версії 16+ з https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [3/6] Перевірка npm версії...
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm не знайдений
    pause
    exit /b 1
)

echo.
echo [4/6] Перевірка Git...
git --version
if %errorlevel% neq 0 (
    echo ❌ Git не встановлений
    echo Встановіть Git з https://git-scm.com/
    pause
    exit /b 1
)

echo.
echo [5/6] Створення папки backups якщо не існує...
if not exist backups mkdir backups

echo.
echo [6/6] Перевірка файлів проекту...
if not exist package.json (
    echo ❌ package.json не знайдений
    pause
    exit /b 1
)

if not exist server.js (
    echo ❌ server.js не знайдений
    pause
    exit /b 1
)

if not exist .gitignore (
    echo ❌ .gitignore не знайдений
    pause
    exit /b 1
)

echo ✅ Всі файли на місці

echo.
echo ========================================
echo           ПІДГОТОВКА ЗАВЕРШЕНА
echo ========================================
echo.
echo Наступні кроки:
echo 1. Прочитайте GITHUB_SETUP.md для налаштування репозиторію
echo 2. Прочитайте DEPLOYMENT.md для інструкцій деплою
echo 3. Створіть GitHub репозиторій та завантажте код
echo 4. На новому сервері клонуйте репозиторій та запустіть сервер
echo.
echo Команди для початку роботи з Git:
echo   git init
echo   git add .
echo   git commit -m "Initial commit"
echo.
pause
