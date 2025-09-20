// src/net/lobbySearch.js
// Enhanced lobby broker using BroadcastChannel with localStorage fallback.
// Supports cross-tab communication for same-origin multiplayer.

const CH_NAME = 'botrally-lobby';
const STORAGE_KEY = 'botrally-lobby-messages';

// Create BroadcastChannel with fallback
let bc;
try {
  bc = new BroadcastChannel(CH_NAME);
} catch (e) {
  console.warn('BroadcastChannel not supported, using localStorage fallback');
  bc = null;
}

// Enhanced message sending with localStorage fallback
function sendMessage(message) {
  const msg = { ...message, timestamp: Date.now() };
  
  if (bc) {
    bc.postMessage(msg);
  } else {
    // Fallback: use localStorage events
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    messages.push(msg);
    // Keep only recent messages (last 50)
    if (messages.length > 50) {
      messages.splice(0, messages.length - 50);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    
    // Trigger storage event manually for same-tab communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(messages)
    }));
  }
}

// Enhanced message listening
function addMessageListener(callback) {
  if (bc) {
    bc.addEventListener('message', callback);
    return () => bc.removeEventListener('message', callback);
  } else {
    // Fallback: listen to storage events
    const handler = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const messages = JSON.parse(e.newValue);
        const latestMessage = messages[messages.length - 1];
        if (latestMessage) {
          callback({ data: latestMessage });
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

function makeCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0,1,O,I
  let out = '';
  for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

function uid() {
  return 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Host creates a lobby and waits for a joiner. */
export function createLobby() {
  const hostId = uid();
  const code = makeCode();
  let cancelled = false;
  const listeners = new Set();

  function onMessage(e) {
    const msg = e.data;
    if (!msg || cancelled || msg.code !== code) return;
    if (msg.t === 'join-request') {
      sendMessage({ t: 'join-accept', code, hostId, joinerId: msg.joinerId, ts: Date.now() });
      listeners.forEach((fn) => fn({ type: 'joined', joinerId: msg.joinerId }));
    }
  }

  const removeListener = addMessageListener(onMessage);
  sendMessage({ t: 'lobby-announce', code, hostId, ts: Date.now() });

  function cancel() {
    cancelled = true;
    removeListener();
    sendMessage({ t: 'lobby-cancel', code, hostId, ts: Date.now() });
  }

  async function waitForJoin({ timeoutMs = 120000 } = {}) {
    if (cancelled) throw new Error('Cancelled');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        removeListener();
        reject(new Error('Join timed out'));
      }, timeoutMs);
      const handler = (evt) => {
        if (evt.type === 'joined') {
          clearTimeout(timer);
          removeListener();
          resolve({ hostId, code, joinerId: evt.joinerId });
        }
      };
      listeners.add(handler);
    });
  }

  return { code, hostId, cancel, waitForJoin };
}

/** Join an existing lobby by code. */
export function joinLobbyByCode(code) {
  const joinerId = uid();
  let cancelled = false;

  function sendJoin() {
    sendMessage({ t: 'join-request', code, joinerId, ts: Date.now() });
  }

  sendJoin();
  const jitter1 = setTimeout(sendJoin, 400);
  const jitter2 = setTimeout(sendJoin, 1200);

  function cancel() {
    cancelled = true;
    clearTimeout(jitter1);
    clearTimeout(jitter2);
  }

  async function waitForAccept({ timeoutMs = 20000 } = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!cancelled) reject(new Error('No host response'));
      }, timeoutMs);

      function onMessage(e) {
        const msg = e.data;
        if (!msg || msg.code !== code) return;
        if (msg.t === 'join-accept' && msg.joinerId === joinerId) {
          clearTimeout(timer);
          removeListener();
          resolve({ code, hostId: msg.hostId, joinerId });
        }
      }
      const removeListener = addMessageListener(onMessage);
    });
  }

  return { joinerId, cancel, waitForAccept };
}
