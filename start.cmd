@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   盲打训练  Touch Typing Trainer
echo   本机地址:  http://127.0.0.1:5173
echo   手机访问:  与本机连同一 WiFi，用下方控制台打印的局域网地址
echo   停止服务:  关闭本窗口 或 按 Ctrl+C
echo ============================================================
echo.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173/'"
node server.mjs
pause
