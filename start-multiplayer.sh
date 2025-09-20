#!/bin/bash

echo "🏁 Starting BotRally Multiplayer System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install
cd server && npm install && cd ..

echo ""
echo "🚀 Starting lobby server on port 8080..."
cd server
node lobby-server.js &
SERVER_PID=$!
cd ..

echo "⏳ Waiting for server to start..."
sleep 2

echo "🎮 Starting React app on port 3000..."
echo ""
echo "🌐 Access the game at:"
echo "   Local:    http://localhost:3000"
echo "   Network:  http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo 'YOUR_IP'):3000"
echo ""
echo "📋 To play multiplayer:"
echo "   1. Host: Click 'Start Race' → 'Host' and share the code"
echo "   2. Friend: Go to your network IP address and join with the code"
echo ""
echo "🛑 Press Ctrl+C to stop both server and client"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $SERVER_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Start React app
npm start

# If we get here, React app has stopped, so cleanup
cleanup