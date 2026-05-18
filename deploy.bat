@echo off
echo.
echo ========================================
echo   ELD Trip Planner - Deploy to Railway
echo ========================================
echo.

echo [1/4] Building React frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] Copying build to backend...
if exist backend\frontend_build rmdir /s /q backend\frontend_build
xcopy /e /i /q frontend\build backend\frontend_build
echo Done.

echo.
echo [3/4] Committing to Git...
git add -A
git commit -m "Deploy: update frontend build %date% %time%"

echo.
echo [4/4] Pushing to GitHub (Railway will auto-deploy)...
git push origin master

echo.
echo ========================================
echo   Done! Railway is deploying now.
echo   Check: https://railway.app
echo ========================================
echo.
pause
