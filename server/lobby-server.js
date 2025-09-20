// Simple WebSocket lobby server for cross-computer multiplayer
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active lobbies
const lobbies = new Map();
const playerConnections = new Map();

// Generate lobby codes
function makeCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// Clean up expired lobbies (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, lobby] of lobbies.entries()) {
    if (now - lobby.created > 10 * 60 * 1000) {
      console.log(`Cleaning up expired lobby: ${code}`);
      lobbies.delete(code);
    }
  }
}, 60000); // Check every minute

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);
      
      switch (message.type) {
        case 'create-lobby':
          handleCreateLobby(ws, message);
          break;
          
        case 'join-lobby':
          handleJoinLobby(ws, message);
          break;
          
        case 'lobby-message':
          handleLobbyMessage(ws, message);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Clean up player from lobbies
    for (const [playerId, connection] of playerConnections.entries()) {
      if (connection === ws) {
        playerConnections.delete(playerId);
        // Notify other players in the same lobby
        for (const [code, lobby] of lobbies.entries()) {
          if (lobby.host === playerId || lobby.players.includes(playerId)) {
            broadcastToLobby(code, {
              type: 'player-disconnected',
              playerId: playerId
            });
            // If host disconnected, close the lobby
            if (lobby.host === playerId) {
              lobbies.delete(code);
            }
          }
        }
        break;
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleCreateLobby(ws, message) {
  const code = makeCode();
  const hostId = message.playerId || `host_${Date.now()}`;
  
  const lobby = {
    code: code,
    host: hostId,
    players: [],
    created: Date.now(),
    maxPlayers: 2
  };
  
  lobbies.set(code, lobby);
  playerConnections.set(hostId, ws);
  
  console.log(`Created lobby ${code} with host ${hostId}`);
  
  ws.send(JSON.stringify({
    type: 'lobby-created',
    code: code,
    hostId: hostId
  }));
}

function handleJoinLobby(ws, message) {
  const { code, playerId } = message;
  const lobby = lobbies.get(code);
  
  if (!lobby) {
    ws.send(JSON.stringify({
      type: 'join-failed',
      message: 'Lobby not found'
    }));
    return;
  }
  
  if (lobby.players.length >= lobby.maxPlayers) {
    ws.send(JSON.stringify({
      type: 'join-failed',
      message: 'Lobby is full'
    }));
    return;
  }
  
  // Add player to lobby
  lobby.players.push(playerId);
  playerConnections.set(playerId, ws);
  
  console.log(`Player ${playerId} joined lobby ${code}`);
  
  // Notify the joiner
  ws.send(JSON.stringify({
    type: 'join-success',
    code: code,
    playerId: playerId,
    hostId: lobby.host
  }));
  
  // Notify the host
  const hostConnection = playerConnections.get(lobby.host);
  if (hostConnection && hostConnection.readyState === WebSocket.OPEN) {
    hostConnection.send(JSON.stringify({
      type: 'player-joined',
      playerId: playerId,
      code: code
    }));
  }
  
  // Broadcast to all players in lobby
  broadcastToLobby(code, {
    type: 'lobby-update',
    lobby: {
      code: lobby.code,
      host: lobby.host,
      players: lobby.players,
      playerCount: lobby.players.length + 1 // +1 for host
    }
  });
}

function handleLobbyMessage(ws, message) {
  const { code, data } = message;
  const lobby = lobbies.get(code);
  
  if (!lobby) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Lobby not found'
    }));
    return;
  }
  
  // Store player status in lobby
  if (data.type === 'player-status') {
    if (!lobby.playerStatus) {
      lobby.playerStatus = {};
    }
    lobby.playerStatus[data.playerRole] = data.status;
    console.log(`Player ${data.playerRole} in lobby ${code} is now ${data.status}`);
  }
  
  // Broadcast message to all players in the lobby
  broadcastToLobby(code, {
    type: 'lobby-message',
    code: code,
    data: data
  });
}

function broadcastToLobby(code, message) {
  const lobby = lobbies.get(code);
  if (!lobby) return;
  
  // Send to host
  const hostConnection = playerConnections.get(lobby.host);
  if (hostConnection && hostConnection.readyState === WebSocket.OPEN) {
    hostConnection.send(JSON.stringify(message));
  }
  
  // Send to all players
  lobby.players.forEach(playerId => {
    const connection = playerConnections.get(playerId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  });
}

server.listen(PORT, () => {
  console.log(`🚀 BotRally Lobby Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Active lobbies will be cleaned up after 10 minutes of inactivity`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down lobby server...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});