# BotRally Multiplayer Setup

This guide will help you set up multiplayer racing between different computers.

## Quick Setup

### 1. Install Dependencies
```bash
# Install main app dependencies
npm install

# Install server dependencies
npm run setup
```

### 2. Start Both Server and Client
```bash
# This starts both the lobby server (port 8080) and React app (port 3000)
npm run dev
```

**OR** start them separately:

```bash
# Terminal 1: Start the lobby server
npm run server

# Terminal 2: Start the React app
npm start
```

### 3. Connect from Different Computers

#### On the Host Computer:
1. Make sure both server (port 8080) and React app (port 3000) are running
2. Go to `http://localhost:3000`
3. Click "Start Race" → "Host"
4. Share the generated code with your friend

#### On the Friend's Computer:
1. Make sure they can access your computer's IP address
2. Go to `http://YOUR_IP_ADDRESS:3000` (replace YOUR_IP_ADDRESS with the host's IP)
3. Click "Start Race" → "Join"
4. Enter the code shared by the host

## Network Configuration

### Finding Your IP Address

**On macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig | findstr "IPv4"
```

### Firewall Settings

Make sure these ports are open on the host computer:
- **Port 3000**: React development server
- **Port 8080**: WebSocket lobby server

**On macOS:**
```bash
# Allow incoming connections (if needed)
sudo pfctl -f /etc/pf.conf
```

**On Windows:**
- Go to Windows Defender Firewall
- Allow apps through firewall
- Add exceptions for ports 3000 and 8080

### Router Configuration (if needed)

If players are on different networks, you may need to:
1. Set up port forwarding on your router for ports 3000 and 8080
2. Use your public IP address instead of local IP

## How It Works

1. **Lobby Server**: A WebSocket server running on port 8080 that manages lobby creation and player connections
2. **React App**: The game client running on port 3000 that connects to the lobby server
3. **Cross-Computer Communication**: Players on different computers connect to the same lobby server using lobby codes

## Troubleshooting

### "Could not connect to multiplayer server"
- Make sure the lobby server is running on port 8080
- Check if port 8080 is blocked by firewall
- Verify the server URL in the browser console

### "Could not find a host"
- Make sure the host created a lobby first
- Verify the lobby code is correct
- Check if both players can reach the same lobby server

### Connection Issues
- Ensure both computers are on the same network OR
- Set up proper port forwarding if on different networks
- Check firewall settings on both computers

## Advanced Configuration

### Cerebras AI Setup (Optional)
For enhanced AI opponents, get a Cerebras API key:
1. Go to https://cloud.cerebras.ai/
2. Sign up and get your API key
3. Update `.env` file:
```bash
REACT_APP_CEREBRAS_API_KEY=your_actual_api_key_here
```

If no API key is provided, the system uses fallback AI algorithms.

### Custom Server URL
Set the `REACT_APP_LOBBY_SERVER` environment variable:
```bash
REACT_APP_LOBBY_SERVER=ws://your-server-ip:8080 npm start
```

### Production Deployment
For production, deploy the lobby server to a cloud service and update the server URL accordingly.

## Example Workflows

### Multiplayer (Player vs Player)

1. **Player 1 (Host)**:
   - Runs `npm start` on their computer (IP: 192.168.1.100)
   - Goes to `http://localhost:3000`
   - Clicks "Start Race" → "Host"
   - Gets code "ABC123"
   - Shares their IP (192.168.1.100) and code with Player 2

2. **Player 2 (Joiner)**:
   - Goes to `http://192.168.1.100:3000`
   - Clicks "Start Race" → "Join"
   - Enters code "ABC123"

3. **Both Players**:
   - Customize their cars (body, wheels, engine, spoiler)
   - Click "Code your car!" to go to the block programming interface
   - Build their racing algorithms using Scratch-like blocks
   - Click "Ready to Race!" when their algorithm is complete
   - Wait for the other player to also be ready
   - Automatically proceed to the multiplayer race when both are ready!

### AI Mode (Player vs AI)

1. **Single Player**:
   - Runs `npm start` on their computer
   - Goes to `http://localhost:3000`
   - Clicks "Race with AI"
   - Customizes their car (body, wheels, engine, spoiler)
   - Clicks "Code vs AI!" to go to the block programming interface
   - Builds their racing algorithm using Scratch-like blocks
   - AI automatically generates a competing algorithm using Cerebras
   - Click "Ready to Race AI!" when algorithm is complete
   - Automatically proceed to AI race when both player and AI are ready!

## Notes

- The lobby server automatically cleans up inactive lobbies after 10 minutes
- Maximum 2 players per lobby currently
- Both players need to be able to access the same lobby server
- The system works great on local networks (same WiFi/Ethernet)