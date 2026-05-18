@echo off
echo Starting ELD Trip Planner...

start "Django Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python manage.py runserver"
timeout /t 2 /nobreak >nul
start "React Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Both servers starting...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo To deploy to Railway, run deploy.bat
