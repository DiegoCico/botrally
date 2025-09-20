import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeroKartShowcase from '../components/HeroKartShowcase';

/* ---------- UI Core ---------- */

const Badge = ({ children, className }) => (
  <div className={`inline-block px-4 py-1.5 text-sm font-bold rounded-full ${className}`}>
    {children}
  </div>
);

const Card = ({ children, className }) => (
  <div className={`p-8 bg-white/5 border-2 rounded-3xl backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-xl ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = 'default', size = 'md', className }) => {
  const base = 'font-bold rounded-2xl hover:scale-105 transition-all duration-200 shadow-lg inline-flex items-center justify-center';
  const sizes = { md: 'px-6 py-3 text-base', lg: 'px-8 py-4 text-lg' };
  const variants = {
    default: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    outline: 'border-2 border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-white bg-transparent',
    ghost: 'text-gray-200 hover:text-indigo-300 bg-transparent shadow-none',
    neon:
      'relative text-white bg-transparent border-2 border-pink-500/60 hover:border-pink-400 ' +
      'shadow-[0_0_24px_2px_rgba(236,72,153,0.35)] ' +
      'after:content-[""] after:absolute after:inset-0 after:bg-gradient-to-r ' +
      'after:from-pink-500/20 after:to-purple-500/20 after:rounded-2xl after:blur ' +
      'hover:shadow-[0_0_32px_4px_rgba(236,72,153,0.5)]',
    ai:
      'relative text-black bg-lime-400 hover:bg-lime-300 border-2 border-lime-300 ' +
      'shadow-[0_0_20px_2px_rgba(163,230,53,0.35)] ' +
      'after:content-[""] after:absolute after:-inset-1 after:rounded-2xl after:border after:border-lime-300/20'
  };

  return (
    <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

/* ---------- Global Hard Black ---------- */
const GlobalHardDark = () => (
  <style>{`
    html, body, #root { background: #000 !important; }
    .app-root { background: #000 !important; }
  `}</style>
);

/* ---------- Racing FX Styles ---------- */
const RacingFX = () => (
  <style>{`
    /* carbon fiber texture bg */
    .carbon {
      background:
        radial-gradient(circle at 25% 25%, rgba(255,255,255,0.02) 2%, transparent 3%),
        radial-gradient(circle at 75% 75%, rgba(255,255,255,0.02) 2%, transparent 3%),
        linear-gradient(45deg, rgba(255,255,255,0.01), rgba(0,0,0,0.25));
      background-size: 16px 16px, 16px 16px, cover;
    }
    /* moving diagonal speed lines */
    .speedlines {
      position: absolute; inset: -20%;
      background:
        repeating-linear-gradient(135deg,
          rgba(99,102,241,0.06) 0 20px,
          transparent 20px 40px);
      animation: move-diag 12s linear infinite;
      filter: blur(0.5px);
      pointer-events: none;
    }
    @keyframes move-diag {
      to { transform: translate3d(-20%, -20%, 0); }
    }
    /* scanlines overlay */
    .scanlines:before {
      content: "";
      position: absolute; inset: 0;
      background: repeating-linear-gradient(
        to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 2px, transparent 3px
      );
      pointer-events: none;
      mix-blend-mode: overlay;
    }
    /* checkered banners (dark) */
    .checkers {
      --s: 22px;
      background:
        conic-gradient(from 90deg, #0b0b0b 90deg, #111 0) 0 0/var(--s) var(--s);
      opacity: 0.08;
      padding: 6px 0;
    }
    /* animated neon border around hero card */
    .neon-border { position: relative; }
    .neon-border:after {
      content: "";
      position: absolute; inset: -2px; border-radius: 1.75rem;
      background: conic-gradient(from 0deg,
        #22d3ee, #6366f1, #a855f7, #ec4899, #22d3ee);
      filter: blur(14px);
      opacity: 0.35;
      animation: spin 8s linear infinite;
      z-index: -1;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* flicker title glow */
    .title-glow {
      text-shadow:
        0 0 10px rgba(99,102,241,0.6),
        0 0 30px rgba(99,102,241,0.35),
        0 0 60px rgba(168,85,247,0.25);
      animation: glowflicker 3.2s ease-in-out infinite;
    }
    @keyframes glowflicker {
      0%, 100% { filter: brightness(1); }
      45% { filter: brightness(1.08); }
      48% { filter: brightness(0.94); }
      52% { filter: brightness(1.12); }
      80% { filter: brightness(1.02); }
    }
  `}</style>
);

/* ---------- Icons ---------- */
const CarIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><path d="M7 17h10"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
  </svg>
);
const PlayIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const SettingsIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l-.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l-.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const ZapIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const UsersIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const TrophyIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

export default function App() {
  const navigate = useNavigate();

  const handleNavigate = (route) => navigate(route);

  return (
    <>
      <GlobalHardDark />
      <div className="app-root min-h-screen bg-black text-[#F8FAFC] font-sans relative overflow-hidden carbon">
        <RacingFX />

        {/* BG FX */}
        <div className="speedlines" />
        <div className="scanlines absolute inset-0 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 checkers" />
        <div className="absolute bottom-0 left-0 right-0 checkers" />

        {/* Header */}
        <header className="relative z-10 p-6">
          <nav className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center animate-pulse">
                <CarIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-wider">BotRally</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost">Garage</Button>
              <Button variant="ghost">Leaderboard</Button>
              <Button variant="ghost">Community</Button>
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="relative z-10 px-6 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="title-glow text-5xl md:text-7xl font-black mb-6 leading-tight">
                Build Your <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400">Dream Kart</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Neon nights. Tight corners. Big wins. Assemble, tune, and send it.
              </p>
            </div>

            {/* Hero viewer */}
            <div className="mb-12">
              <div className="neon-border relative mx-auto w-full max-w-3xl h-[420px] bg-black rounded-3xl border border-fuchsia-500/30 overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.25)]">
                <HeroKartShowcase />
                {/* HUD */}
                <div className="pointer-events-none absolute top-4 left-4 flex gap-2">
                </div>
                <div className="pointer-events-none absolute bottom-4 right-4 text-right">
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" variant="neon" onClick={() => handleNavigate('/race')}>
                <PlayIcon className="w-6 h-6 mr-2" />
                Start Race
              </Button>
              <Button size="lg" variant="ai" onClick={() => handleNavigate('/race/ai')}>
                🤖 Race with AI
              </Button>
              <Button onClick={() => handleNavigate('/carMaker')} size="lg" variant="outline"
                className="border-fuchsia-400 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-white">
                <SettingsIcon className="w-6 h-6 mr-2" />
                Customize Kart
              </Button>
            </div>

            {/* Feature cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="border-indigo-500/30 hover:border-indigo-400/60">
                <div className="w-16 h-16 bg-indigo-600/30 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <ZapIcon className="w-8 h-8 text-indigo-300" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Turbo Parts</h3>
                <p className="text-slate-300 leading-relaxed">
                  Engines, tires, aero, and nitro. Tune for grip or go full speed demon.
                </p>
              </Card>

              <Card className="border-pink-500/30 hover:border-pink-400/60">
                <div className="w-16 h-16 bg-pink-600/30 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <UsersIcon className="w-8 h-8 text-pink-300" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Multiplayer Chaos</h3>
                <p className="text-slate-300 leading-relaxed">
                  Party lobbies, power-ups, photo finishes. Bring your crew.
                </p>
              </Card>

              <Card className="border-emerald-500/30 hover:border-emerald-400/60">
                <div className="w-16 h-16 bg-emerald-600/30 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <TrophyIcon className="w-8 h-8 text-emerald-300" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Season Trophies</h3>
                <p className="text-slate-300 leading-relaxed">
                  Climb the ladder, unlock mythic parts, and flex your decal set.
                </p>
              </Card>
            </div>
          </div>
        </main>

        <footer className="relative z-10 mt-20 py-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-slate-400">
              Track’s hot. Engines ready.
              <span className="text-fuchsia-400 font-bold ml-2">Let’s race.</span>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
