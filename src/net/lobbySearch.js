// src/net/lobbySearch.js
// Tiny same-origin lobby broker using BroadcastChannel.
// Swap internals later for WebSocket/HTTP without touching the UI.

const CH_NAME = 'botrally-lobby';
const bc = new BroadcastChannel(CH_NAME);

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
      bc.postMessage({ t: 'join-accept', code, hostId, joinerId: msg.joinerId, ts: Date.now() });
      listeners.forEach((fn) => fn({ type: 'joined', joinerId: msg.joinerId }));
    }
  }

  bc.addEventListener('message', onMessage);
  bc.postMessage({ t: 'lobby-announce', code, hostId, ts: Date.now() });

  function cancel() {
    cancelled = true;
    bc.removeEventListener('message', onMessage);
    bc.postMessage({ t: 'lobby-cancel', code, hostId, ts: Date.now() });
  }

  async function waitForJoin({ timeoutMs = 120000 } = {}) {
    if (cancelled) throw new Error('Cancelled');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        bc.removeEventListener('message', onMessage);
        reject(new Error('Join timed out'));
      }, timeoutMs);
      const handler = (evt) => {
        if (evt.type === 'joined') {
          clearTimeout(timer);
          bc.removeEventListener('message', onMessage);
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
    bc.postMessage({ t: 'join-request', code, joinerId, ts: Date.now() });
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
          bc.removeEventListener('message', onMessage);
          resolve({ code, hostId: msg.hostId, joinerId });
        }
      }
      bc.addEventListener('message', onMessage);
    });
  }

  return { joinerId, cancel, waitForAccept };
}
