@echo off
chcp 65001 >nul
title Tao Link Web Public (Cloudflare Tunnel) - Thien Duong Tinh Tam
cd /d "%~dp0"

echo ==================================================================
echo   TẠO ĐƯỜNG LINK WEB PUBLIC CHO APP ĐI CHÙA ONLINE
echo ==================================================================
echo.
echo Đang kết nối Cloudflare Tunnel tới server local http://localhost:3000...
echo Link HTTPS công khai sẽ hiển thị bên dưới dạng:
echo   https://xxxx-xxxx-xxxx.trycloudflare.com
echo.
echo * Lưu ý: Giữ cửa sổ này mở để link web hoạt động liên tục.
echo ==================================================================
echo.

cloudflared.exe tunnel --url http://localhost:3000
pause
