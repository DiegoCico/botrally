@echo off
echo 🏁 Starting BotRally Multiplayer System...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install
cd server
call npm install
cd ..

echo.
echo 🚀 Starting lobby server on port 8080...
cd server
start /b node lobby-server.js
cd ..

echo ⏳ Waiting for server to start...
timeout /t 3 /nobreak >nul

echo 🎮 Starting React app on port 3000...
echo.
echo 🌐 Access the game at:
echo    Local:    http://localhost:3000
echo    Network:  http://YOUR_IP:3000
echo.
echo 📋 To play multiplayer:
echo    1. Host: Click 'Start Race' → 'Host' and share the code
echo    2. Friend: Go to your network IP address and join with the code
echo.
echo 🛑 Press Ctrl+C to stop both server and client
echo.

REM Start React app
call npm start

echo.
echo 🛑 Shutting down...
taskkill /f /im node.exe >nul 2>&1
pause