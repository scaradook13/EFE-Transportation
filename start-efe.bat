@echo off
title EFE Taxi Dispatch Server
cd /d "%~dp0"

:: Allow internal self-signed TLS requests
set NODE_TLS_REJECT_UNAUTHORIZED=0

echo ============================================================
echo   EFE TAXI DISPATCH SYSTEM (HTTPS LAN MODE)
echo ============================================================
echo.
echo  Starting server and biometric services...
echo  Your browser will open automatically in 5 seconds.
echo.
echo  Local access:       https://localhost:3000
echo  LAN/Client access:  https://192.168.1.3:3000
echo.
echo  (Keep this window minimized while using the system)
echo ============================================================
echo.

:: 1. Ensure Biometric Hardware Service is running in the background (no window)
tasklist /fi "imagename eq BiometricService.exe" | findstr /i "BiometricService.exe" >nul
if errorlevel 1 (
    start "" /d "%~dp0server\biometric-service" /b "%~dp0server\biometric-service\BiometricService.exe"
)

:: 2. Automatically open the browser after 5 seconds with HTTPS
start "" cmd /c "timeout /t 5 /nobreak >nul && start https://localhost:3000"

:: 3. Start the server with host binding for LAN/mobile access
npm run dev
