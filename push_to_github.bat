@echo off
title Push VoxGuard to GitHub
cd /d "%~dp0"
echo ========================================================
echo   Pushing VoxGuard Enterprise to GitHub...
echo   Remote: https://github.com/navadeepgevini/voxguardai.git
echo ========================================================
echo.
git push -u origin master
if %ERRORLEVEL% neq 0 (
    git branch -M main
    git push -u origin main
)
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   SUCCESS! Pushed to https://github.com/navadeepgevini/voxguardai
    echo ========================================================
) else (
    echo ========================================================
    echo   Push failed or requires login.
    echo   If prompted, sign in via browser or use a GitHub Token.
    echo ========================================================
)
pause
