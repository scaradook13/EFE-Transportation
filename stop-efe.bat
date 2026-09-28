@echo off
title Stopping EFE Taxi Dispatch System...
cd /d "%~dp0"

echo ============================================================
echo   STOPPING EFE TAXI DISPATCH SYSTEM
echo ============================================================
echo.

echo Stopping server and biometric services...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im BiometricService.exe >nul 2>&1

echo.
echo System stopped successfully.
timeout /t 2 >nul
exit
