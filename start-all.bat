@echo off
chcp 65001 >nul
title Thien Duong Tinh Tam - Khoi Dong He Thong LIVE
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ==================================================================
echo   KHOI DONG APP LIVE STREAM DI CHUA BAI PHAT [THIEN DUONG TINH TAM]
echo ==================================================================

if exist "ThienDuongControl.exe" (
    echo [1/2] Dang mo Bang Dieu Khien WinForms ThienDuongControl.exe...
    start "" "ThienDuongControl.exe"
    ping 127.0.0.1 -n 3 >nul
    echo [2/2] Dang mo giao dien Live Overlay 9:16 tren trinh duyet...
    start "" "http://localhost:3000"
) else (
    echo [1/2] Dang khoi dong Node Server...
    start "ThienDuongServer" cmd /k "cd /d "%~dp0server" && node server.js"
    ping 127.0.0.1 -n 3 >nul
    echo [2/2] Dang mo giao dien Live Overlay tren trinh duyet...
    start "" "http://localhost:3000"
)

echo.
echo He thong da khoi dong thanh cong!
echo - Overlay Live 9:16:  http://localhost:3000
echo - Web Admin Dashboard: http://localhost:3000/admin
