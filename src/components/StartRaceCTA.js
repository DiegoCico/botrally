// src/components/StartRaceCTA.js
import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createLobby, joinLobbyByCode } from '../net/lobbySearch';

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
    <button disabled={disabled} onClick={onClick}
      className={[base, sizes[size], variants[variant], disabled ? 'opacity-70 cursor-not-allowed' : '', className].join(' ')}>
      {children}
    </button>
  );
};

export default function StartRaceCTA() {
  const navigate = useNavigate();
  const loc = useLocation(); // if you want route-aware things later
  const [mode, setMode] = useState('idle'); // idle | choose | join | join-search | host | host-wait
  const [code, setCode] = useState('');
  const [hostState, setHostState] = useState(null); // { code, cancel, waitForJoin }
  const [err, setErr] = useState('');

  const containerStyle = useMemo(() => {
    if (mode === 'choose') return 'gap-3 w-[340px]';
    if (mode.startsWith('join')) return 'w-[380px]';
    if (mode.startsWith('host')) return 'w-[440px]';
    return 'w-[170px]';
  }, [mode]);

  function reset() {
    setMode('idle');
    setCode('');
    setErr('');
    if (hostState?.cancel) hostState.cancel();
    setHostState(null);
  }

  function onStart() {
    setErr('');
    setMode('choose');
  }
  function onJoin() {
    setErr('');
    setMode('join');
  }

  async function onJoinGo() {
    const clean = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) { setErr('Enter a valid code'); return; }
    setErr('');
    setMode('join-search');
    try {
      const j = joinLobbyByCode(clean);
      const result = await j.waitForAccept({ timeoutMs: 20000 });
      // Joiner → p2; carry code in URL
      navigate(`/carMaker?code=${encodeURIComponent(result.code)}&role=p2`);
    } catch (e) {
      setErr(e.message || 'Could not find a host.');
      setMode('join');
    }
  }

  async function onHost() {
    setErr('');
    setMode('host');
    const lobby = createLobby();
    setHostState(lobby);
    setCode(lobby.code);
    setMode('host-wait');
    try {
      await lobby.waitForJoin({ timeoutMs: 120000 });
      // Host → p1; carry code in URL
      navigate(`/carMaker?code=${encodeURIComponent(lobby.code)}&role=p1`);
    } catch (e) {
      setErr('Nobody joined in time.');
      setMode('host');
    }
  }

  return (
    <div className="relative">
      <div className={`flex items-center transition-all duration-300 ${containerStyle}`}>
        {/* IDLE */}
        {mode === 'idle' && (
          <Button onClick={onStart} className="min-w-[170px]">Start Race</Button>
        )}

        {/* SPLIT: Join | Host */}
        {mode === 'choose' && (
          <>
            <Button onClick={onJoin} className="flex-1">Join</Button>
            <Button variant="lime" onClick={onHost} className="flex-1">Host</Button>
            <button onClick={reset} className="ml-2 text-xs text-slate-300 hover:text-white">Cancel</button>
          </>
        )}

        {/* JOIN: enter code */}
        {mode === 'join' && (
          <div className="flex items-center gap-2 w-full">
            <input
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/15 focus:border-fuchsia-400/60 outline-none font-mono tracking-widest uppercase"
              placeholder="ENTER CODE"
              value={code}
              onChange={(e)=>setCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <Button onClick={onJoinGo} className="min-w-[110px]">Join</Button>
            <button onClick={reset} className="text-xs text-slate-300 hover:text-white">Back</button>
          </div>
        )}

        {/* JOIN: searching */}
        {mode === 'join-search' && (
          <div className="flex items-center gap-3 w-full">
            <div className="h-5 w-5 rounded-full border-2 border-fuchsia-400 border-t-transparent animate-spin" />
            <div className="text-sm text-slate-300">Looking for host <span className="font-mono">{code}</span>…</div>
            <button onClick={reset} className="ml-auto text-xs text-slate-300 hover:text-white">Cancel</button>
          </div>
        )}

        {/* HOST: show/share code + wait */}
        {mode === 'host' && (
          <div className="flex items-center gap-3 w-full">
            <div className="text-sm text-slate-300">Your code:</div>
            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 font-mono text-lg tracking-widest">{code}</div>
            <Button variant="lime" onClick={onHost} className="ml-auto">Re-Host</Button>
            <button onClick={reset} className="text-xs text-slate-300 hover:text-white">Cancel</button>
          </div>
        )}

        {mode === 'host-wait' && (
          <div className="flex items-center gap-3 w-full">
            <div className="text-sm text-slate-300">Share this code:</div>
            <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 font-mono text-lg tracking-widest">{code}</div>
            <button
              onClick={() => navigator.clipboard.writeText(
                `${window.location.origin}/carMaker?code=${encodeURIComponent(code)}&role=p2`
              )}
              className="text-xs px-2 py-1 rounded-lg border border-white/15 hover:border-white/40"
            >
              Copy invite
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <div className="h-5 w-5 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
              <div className="text-sm text-slate-300">Waiting for a player…</div>
            </div>
            <button onClick={reset} className="text-xs text-slate-300 hover:text-white">Cancel</button>
          </div>
        )}
      </div>

      {err && <div className="mt-2 text-xs text-rose-300">{err}</div>}
    </div>
  );
}
