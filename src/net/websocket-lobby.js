// WebSocket-based lobby system for cross-computer multiplayer
// Connects to a WebSocket server to enable multiplayer across different computers

const DEFAULT_SERVER_URL = process.env.REACT_APP_LOBBY_SERVER || 'ws://localhost:8080';

class WebSocketLobbyClient {
  constructor(serverUrl = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.connected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('Connected to lobby server');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing server message:', error);
          }
        };
        
        this.ws.onclose = () => {
          console.log('Disconnected from lobby server');
          this.connected = false;
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!this.connected) {
            reject(new Error('Failed to connect to lobby server'));
          }
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.connected) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  handleMessage(message) {
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  on(messageType, callback) {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    this.listeners.get(messageType).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(messageType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
      throw new Error('Not connected to server');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.listeners.clear();
  }
}

// Singleton instance
let lobbyClient = null;

async function getLobbyClient() {
  if (!lobbyClient) {
    lobbyClient = new WebSocketLobbyClient();
    await lobbyClient.connect();
  }
  return lobbyClient;
}

function uid() {
  return 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Host creates a lobby and waits for a joiner. */
export async function createLobby() {
  const client = await getLobbyClient();
  const hostId = uid();
  let cancelled = false;
  const listeners = new Set();

  return new Promise((resolve, reject) => {
    // Listen for lobby creation response
    const unsubscribeCreated = client.on('lobby-created', (message) => {
      if (message.hostId === hostId) {
        unsubscribeCreated();
        
        // Now listen for players joining
        const unsubscribeJoined = client.on('player-joined', (message) => {
          if (!cancelled) {
            listeners.forEach((fn) => fn({ type: 'joined', joinerId: message.playerId }));
          }
        });

        const lobby = {
          code: message.code,
          hostId: message.hostId,
          cancel: () => {
            cancelled = true;
            unsubscribeJoined();
            // Could send a cancel message to server here
          },
          waitForJoin: ({ timeoutMs = 120000 } = {}) => {
            if (cancelled) throw new Error('Cancelled');
            
            return new Promise((resolveJoin, rejectJoin) => {
              const timer = setTimeout(() => {
                rejectJoin(new Error('Join timed out'));
              }, timeoutMs);
              
              const handler = (evt) => {
                if (evt.type === 'joined') {
                  clearTimeout(timer);
                  resolveJoin({ hostId: message.hostId, code: message.code, joinerId: evt.joinerId });
                }
              };
              listeners.add(handler);
            });
          }
        };
        
        resolve(lobby);
      }
    });

    // Listen for errors
    const unsubscribeError = client.on('error', (message) => {
      unsubscribeCreated();
      unsubscribeError();
      reject(new Error(message.message || 'Failed to create lobby'));
    });

    // Send create lobby request
    try {
      client.send({
        type: 'create-lobby',
        playerId: hostId
      });
    } catch (error) {
      unsubscribeCreated();
      unsubscribeError();
      reject(error);
    }
  });
}

/** Join an existing lobby by code. */
export async function joinLobbyByCode(code) {
  const client = await getLobbyClient();
  const joinerId = uid();
  let cancelled = false;

  const joiner = {
    joinerId,
    cancel: () => {
      cancelled = true;
    },
    waitForAccept: ({ timeoutMs = 20000 } = {}) => {
      return new Promise((resolve, reject) => {
        if (cancelled) {
          reject(new Error('Cancelled'));
          return;
        }

        const timer = setTimeout(() => {
          unsubscribeSuccess();
          unsubscribeFailed();
          if (!cancelled) reject(new Error('No host response'));
        }, timeoutMs);

        const unsubscribeSuccess = client.on('join-success', (message) => {
          if (message.playerId === joinerId) {
            clearTimeout(timer);
            unsubscribeSuccess();
            unsubscribeFailed();
            resolve({ code: message.code, hostId: message.hostId, joinerId: message.playerId });
          }
        });

        const unsubscribeFailed = client.on('join-failed', (message) => {
          clearTimeout(timer);
          unsubscribeSuccess();
          unsubscribeFailed();
          reject(new Error(message.message || 'Failed to join lobby'));
        });

        // Send join request
        try {
          client.send({
            type: 'join-lobby',
            code: code,
            playerId: joinerId
          });
        } catch (error) {
          clearTimeout(timer);
          unsubscribeSuccess();
          unsubscribeFailed();
          reject(error);
        }
      });
    }
  };

  return joiner;
}

// Export the client for advanced usage
export { getLobbyClient };