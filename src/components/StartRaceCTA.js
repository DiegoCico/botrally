// src/components/StartRaceCTA.js
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLobby, joinLobbyByCode } from '../net/websocket-lobby';

/* Local Button with your neon styles */
const Button = ({ onClick, children, variant = 'neon', size = 'lg', className = '', disabled }) => {
  const base = 'inline-flex items-center justify-center font-extrabold rounded-2xl transition-all duration-200';
  const sizes = { md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base md:text-lg' };
  const variants = {
    neon:
      'relative text-white border-2 border-fuchsia-500/60 hover:border-fuchsia-300 ' +
      'shadow-[0_0_28px_rgba(236,72,153,.35)] hover:shadow-[0_0_40px_rgba(236,72,153,.55)] ' +
      'after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-r after:from-fuchsia-500/20 after:to-indigo-500/20 after:-z-10',
    lime:
      'text-black bg-lime-400 hover:bg-lime-300 border-2 border-lime-300 ' +
      'shadow-[0_0_20px_rgba(163,230,53,.35)]',
    ghost: 'text-slate-200 hover:text-white hover:scale-105',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        base, sizes[size], variants[variant],
        disabled ? 'opacity-70 cursor-not-allowed' : '', className,
      ].join(' ')}
    >
      {children}
    </button>
  );
};

export default function StartRaceCTA() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('idle'); // idle | choose | join | join-search | host-wait
  const [code, setCode] = useState('');
  const [hostState, setHostState] = useState(null); // { code, cancel, waitForJoin }
  const [err, setErr] = useState('');
  const anchorRef = useRef(null);

  // Close on outside click or Esc
  useEffect(() => {
    function onDocDown(e) {
      if (!anchorRef.current) return;
      if (!anchorRef.current.contains(e.target)) closeAll();
    }
    function onKey(e) {
      if (e.key === 'Escape') closeAll();
    }
    document.addEventListener('mousedown', onDocDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [hostState]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeAll() {
    setMode('idle');
    setErr('');
    setCode('');
    if (hostState?.cancel) hostState.cancel();
    setHostState(null);
  }

  function onStart() {
    setErr('');
    setMode((m) => (m === 'choose' ? 'idle' : 'choose'));
  }
  function onJoinClick() {
    setErr('');
    setMode('join');
  }

  async function onJoinGo() {
    const clean = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) { setErr('Enter a valid code'); return; }
    setErr('');
    setMode('join-search');
    try {
      const j = await joinLobbyByCode(clean);
      const result = await j.waitForAccept({ timeoutMs: 20000 });
      navigate(`/carMaker?code=${encodeURIComponent(result.code)}&role=p2`);
    } catch (e) {
      console.error('Join error:', e);
      if (e.message.includes('connect') || e.message.includes('server')) {
        setErr('Could not connect to multiplayer server. Make sure the lobby server is running on localhost:8080');
      } else {
        setErr(e.message || 'Could not find a host.');
      }
      setMode('join');
    }
  }

  async function onHostClick() {
    setErr('');
    setMode('host-wait');
    try {
      const lobby = await createLobby();
      setHostState(lobby);
      setCode(lobby.code);
      
      await lobby.waitForJoin({ timeoutMs: 120000 });
      navigate(`/carMaker?code=${encodeURIComponent(lobby.code)}&role=p1`);
    } catch (e) {
      console.error('Host error:', e);
      if (e.message.includes('connect') || e.message.includes('server')) {
        setErr('Could not connect to multiplayer server. Make sure the lobby server is running on localhost:8080');
      } else {
        setErr(e.message || 'Nobody joined in time.');
      }
      setMode('choose');
    }
  }

  return (
    <div ref={anchorRef} className="relative inline-block align-middle">
      {/* This is the only thing that takes layout space */}
      <Button onClick={onStart} className="min-w-[170px]">Start Race</Button>

      {/* Bigger dropdown (absolute so layout doesn't grow) */}
      {mode !== 'idle' && (
        <div
          className={[
            'absolute left-1/2 -translate-x-1/2 mt-2 z-30 box-border',
            'rounded-2xl border border-white/15 bg-black/90 backdrop-blur',
            // WIDER: scales up with breakpoint; still capped by viewport on mobile
            'w-80 sm:w-96 md:w-[28rem] max-w-[calc(100vw-2rem)]',
            'shadow-[0_10px_30px_rgba(168,85,247,.25)] p-4 sm:p-5',
            'overflow-hidden',
            // pop-down animation
            'transition-all duration-300 ease-out opacity-100 translate-y-0 scale-100',
          ].join(' ')}
        >
          {/* CHOOSE */}
          {mode === 'choose' && (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={onJoinClick} size="md">Join</Button>
              <Button onClick={onHostClick} size="md" variant="lime">Host</Button>
            </div>
          )}

          {/* JOIN input */}
          {mode === 'join' && (
            <div className="flex items-center gap-3 min-w-0">
              <input
                autoFocus
                className="w-0 flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/10 border border-white/15 focus:border-fuchsia-400/60 outline-none font-mono tracking-widest uppercase text-sm"
                placeholder="ENTER CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <Button onClick={onJoinGo} size="md" className="shrink-0">Join</Button>
            </div>
          )}

          {/* JOIN searching */}
          {mode === 'join-search' && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-5 w-5 rounded-full border-2 border-fuchsia-400 border-t-transparent animate-spin shrink-0" />
              <div className="text-sm text-slate-300 min-w-0">Looking for host <span className="font-mono">{code}</span>…</div>
            </div>
          )}

          {/* HOST waiting — wider, wraps if needed */}
          {mode === 'host-wait' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <div className="text-xs text-slate-300 shrink-0">Share Code</div>
                <div
                  className={[
                    'px-3 py-2 rounded-lg bg-white/10 border border-white/15',
                    'font-mono text-lg md:text-xl tracking-widest',
                    'flex-1 min-w-[10rem] text-center select-all',
                  ].join(' ')}
                  title={code}
                >
                  {code}
                </div>
                <button
                  onClick={() => {
                    const joinUrl = `${window.location.origin}/carMaker?code=${encodeURIComponent(code)}&role=p2`;
                    navigator.clipboard.writeText(joinUrl).then(() => {
                      // Could add a toast notification here
                      console.log('Join link copied to clipboard');
                    }).catch(() => {
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = joinUrl;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    });
                  }}
                  className="text-[11px] px-3 py-1 rounded-lg border border-white/15 hover:border-white/40 shrink-0"
                >
                  Copy Link
                </button>
              </div>

              {/* Status and instructions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
                  <div className="text-xs text-slate-300">Waiting for player to join...</div>
                </div>
                <button
                  onClick={closeAll}
                  className="text-xs px-2 py-1 rounded border border-white/15 hover:border-white/40 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="text-xs text-slate-400 text-center">
                Share the code <span className="font-mono text-fuchsia-300">{code}</span> with your friend, or send them the copied link!
              </div>
            </div>
          )}

          {/* error line */}
          {err && <div className="mt-3 text-[12px] text-rose-300 break-words">{err}</div>}
        </div>
      )}
    </div>
  );
}
