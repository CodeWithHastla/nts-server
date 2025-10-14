@echo off
echo ========================================
echo    NTS Server - GitHub Deploy Script
echo ========================================
echo.

echo [1/3] Перевірка Git статусу...
"C:\Program Files\Git\bin\git.exe" status
echo.

echo [2/3] Відображення remote репозиторіїв...
"C:\Program Files\Git\bin\git.exe" remote -v
echo.

echo [3/3] Готово до відправки!
echo.
echo ========================================
echo           НАСТУПНІ КРОКИ:
echo ========================================
echo.
echo 1. Створи репозиторій на GitHub:
echo    - Назва: nts-server
echo    - Тип: Private
echo    - НЕ додавай README/.gitignore
echo.
echo 2. Додай remote (заміни YOUR_USERNAME):
echo    git remote add origin https://github.com/YOUR_USERNAME/nts-server.git
echo.
echo 3. Відправ код:
echo    git push -u origin main
echo.
echo 4. Перевір на GitHub що файли завантажені
echo.
echo ========================================
echo Детальні інструкції в GITHUB_COMMANDS.md
echo ========================================
echo.
pause
