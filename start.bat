@echo off
echo Starting ELD Trip Planner...

:: Start Django backend in a new terminal
start "Django Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python manage.py runserver"

:: Start React frontend in a new terminal
start "React Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo Both servers are starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
