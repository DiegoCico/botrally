// src/pages/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import HeroKartShowcase from '../components/HeroKartShowcase';

/* --------------------------- Tiny UI Primitives --------------------------- */
const Button = ({ onClick, children, variant = 'neon', size = 'lg', className = '' }) => {
  const base = 'inline-flex items-center justify-center font-extrabold rounded-2xl transition-all duration-200';
  const sizes = { md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base md:text-lg' };
  const variants = {
    neon:
      'relative text-white border-2 border-fuchsia-500/60 hover:border-fuchsia-300 ' +
      'shadow-[0_0_28px_rgba(236,72,153,.35)] hover:shadow-[0_0_40px_rgba(236,72,153,.55)] ' +
      'after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-r after:from-fuchsia-500/20 after:to-indigo-500/20 after:-z-10',
    ghost: 'text-slate-200 hover:text-white hover:scale-105',
    lime:
      'text-black bg-lime-400 hover:bg-lime-300 border-2 border-lime-300 ' +
      'shadow-[0_0_20px_rgba(163,230,53,.35)]'
  };
  return (
    <button onClick={onClick} className={[base, sizes[size], variants[variant], className].join(' ')}>{children}</button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`p-5 md:p-6 bg-white/5 border rounded-3xl backdrop-blur-sm hover:translate-y-[-2px] hover:shadow-xl transition-all ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className = '' }) => (
  <span className={`px-3 py-1 text-xs font-black rounded-full tracking-wider ${className}`}>{children}</span>
);

/* ------------------------------- FX Styles -------------------------------- */
const FX = () => (
  <style>{`
    html, body, #root { background:#000 }
    .arcade-grid {
      position:absolute; inset:0; pointer-events:none;
      background:
        radial-gradient(60% 60% at 50% 10%, rgba(99,102,241,.18), transparent 55%),
        radial-gradient(40% 60% at 80% 10%, rgba(236,72,153,.16), transparent 60%),
        repeating-linear-gradient(to right, rgba(255,255,255,.04) 0 1px, transparent 1px 40px),
        repeating-linear-gradient(to bottom, rgba(255,255,255,.03) 0 1px, transparent 1px 40px);
      mask: radial-gradient(80% 80% at 50% 30%, #000 40%, transparent);
    }
    .scan {
      position:absolute; inset:0; pointer-events:none;
      background: linear-gradient(180deg, transparent, rgba(255,255,255,.05), transparent);
      mix-blend-mode: overlay; animation: scanMove 7s linear infinite;
    }
    @keyframes scanMove { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
    .marquee {
      mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
      white-space: nowrap; overflow: hidden;
    }
    .marquee span { display:inline-block; padding-left:100%; animation: marquee 16s linear infinite; }
    @keyframes marquee { to { transform: translateX(-100%); } }
    .cabinet {
      position: relative; border-radius: 1.75rem; overflow: hidden;
      box-shadow: 0 0 0 1px rgba(244,114,182,.3), 0 0 50px rgba(168,85,247,.25);
    }
    .cabinet:after {
      content:""; position:absolute; inset:-2px; border-radius:inherit;
      background: conic-gradient(from 0deg, #22d3ee, #6366f1, #a855f7, #ec4899, #22d3ee);
      filter: blur(18px); opacity:.35; animation: spin 10s linear infinite;
      z-index:-1;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title-glow {
      text-shadow:
        0 0 10px rgba(99,102,241,.7),
        0 0 24px rgba(168,85,247,.5),
        0 0 60px rgba(236,72,153,.3);
    }
  `}</style>
);

/* --------------------------------- Page ---------------------------------- */
export default function Home() {
  const navigate = useNavigate();
  const go = (r) => () => navigate(r);

  return (
    <>
      <FX />
      <div className="relative min-h-screen text-slate-100 font-sans selection:bg-fuchsia-500/40">
        {/* BG */}
        <div className="arcade-grid" />
        <div className="scan" />

        {/* Top Bar */}
        <header className="relative z-10">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
                <svg width="22" height="22" viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="2">
                  <path d="M7 17h10" /><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M3 12l2-4c.3-.6.9-1 1.6-1h6c.6 0 1.3.3 1.7.7L16 10c0 0 3 .6 4.5 1.1 1 .3 1.5 1.1 1.5 2v3c0 .6-.4 1-1 1h-2"/>
                </svg>
              </div>
              <div className="text-2xl font-black tracking-widest">BotRally</div>
            </div>
            <nav className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={go('/docs')}>Docs</Button>
              <Button variant="ghost" onClick={go('/leaderboard')}>Leaderboard</Button>
              <Button variant="ghost" onClick={go('/garage')}>Garage</Button>
              <Button variant="lime" onClick={go('/race')}>Play</Button>
            </nav>
          </div>
        </header>

        {/* Racing Marquee */}
        <div className="marquee text-sm tracking-widest text-fuchsia-300/80 py-2 border-y border-white/10">
          <span>WRITE AN ALGORITHM • TEST ON THE TRACK • BEAT THE GRID • LEARN AS YOU RACE • </span>
        </div>

        {/* Hero */}
        <main className="relative z-10">
          <section className="max-w-7xl mx-auto px-6 pt-10 md:pt-14 grid md:grid-cols-[1.1fr_.9fr] gap-8">
            {/* Left: copy + CTAs */}
            <div className="flex flex-col justify-center">
              <div className="mb-3 flex items-center gap-2">
                <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40">ARCADE • AI • ALGO</Badge>
                <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">LEARN BY RACING</Badge>
              </div>
              <h1 className="title-glow text-4xl md:text-6xl font-black leading-tight mb-4">
                Code your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400">racing brain</span>.
              </h1>
              <p className="text-slate-300/90 text-base md:text-lg max-w-xl">
                Build a driving algorithm—overtake logic, cornering lines, throttle curves—and unleash it on live tracks. 
                Beat bots, climb ladders, and pick up CS concepts as you go.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={go('/carMaker')} className="min-w-[160px]">Start Race</Button>
                <Button variant="lime" onClick={go('/race/ai')}>Race with AI</Button>
                <Button variant="ghost" onClick={go('/docs/algorithms')}>How it works</Button>
              </div>

              {/* Quick stats */}
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
                <Card className="text-center">
                  <div className="text-xs text-slate-400">Algorithms</div>
                  <div className="text-xl md:text-2xl font-black">3 Modes</div>
                </Card>
                <Card className="text-center">
                  <div className="text-xs text-slate-400">Live Tracks</div>
                  <div className="text-xl md:text-2xl font-black">Technical Hilly</div>
                </Card>
                <Card className="text-center">
                  <div className="text-xs text-slate-400">Learning</div>
                  <div className="text-xl md:text-2xl font-black">Path PID DQN</div>
                </Card>
              </div>
            </div>

            {/* Right: cabinet viewer */}
            <div className="cabinet border border-fuchsia-500/30 bg-black rounded-3xl h-[420px] md:h-[480px]">
              <HeroKartShowcase />
              {/* HUD */}
              <div className="pointer-events-none absolute top-3 left-3 flex gap-2">
              </div>
              <div className="pointer-events-none absolute bottom-3 right-4 text-right">
              </div>
            </div>
          </section>

          {/* Preset Algorithms */}
          <section className="max-w-7xl mx-auto px-6 mt-12">
            <h2 className="text-xl md:text-2xl font-black mb-4 tracking-wide">Pick a Driving Style</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-indigo-500/40 hover:border-indigo-400/70">
                <div className="text-indigo-300 font-black mb-1">🏁 Racing Line (Greedy)</div>
                <p className="text-slate-300 text-sm mb-4">Follow the shortest path with speed caps at curvature peaks.</p>
                <Button size="md" onClick={go('/editor?preset=greedy')}>Use preset</Button>
              </Card>
              <Card className="border-emerald-500/40 hover:border-emerald-400/70">
                <div className="text-emerald-300 font-black mb-1">🎯 PID Controller</div>
                <p className="text-slate-300 text-sm mb-4">Steer error → PID; throttle from look-ahead + slip estimate.</p>
                <Button size="md" onClick={go('/editor?preset=pid')}>Use preset</Button>
              </Card>
              <Card className="border-pink-500/40 hover:border-pink-400/70">
                <div className="text-pink-300 font-black mb-1">🧠 RL Overtake</div>
                <p className="text-slate-300 text-sm mb-4">State: gap, speed delta, curvature. Action: lane/boost.</p>
                <Button size="md" onClick={go('/editor?preset=rl')}>Use preset</Button>
              </Card>
            </div>
          </section>

          {/* Mini Leaderboard + Tutorial chips */}
          <section className="max-w-7xl mx-auto px-6 mt-12 grid md:grid-cols-[1.2fr_.8fr] gap-6">
            <Card className="border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-black">Leaderboard (Daily)</h3>
                <Button size="md" variant="ghost" onClick={go('/leaderboard')}>View all →</Button>
              </div>
              <div className="divide-y divide-white/10">
                {[
                  { n:1, name:'ApexHuntr', time:'01:12.443', algo:'PID+' },
                  { n:2, name:'SplineLord', time:'01:13.021', algo:'Racing Line' },
                  { n:3, name:'BoostedRL', time:'01:13.552', algo:'DQN' },
                ].map((r)=>(
                  <div key={r.n} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 text-center text-fuchsia-300 font-black">{r.n}</div>
                      <div>
                        <div className="font-bold">{r.name}</div>
                        <div className="text-xs text-slate-400">{r.algo}</div>
                      </div>
                    </div>
                    <div className="font-mono">{r.time}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-white/10">
              <h3 className="text-lg font-black mb-3">Learn while racing</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Path planning','/docs/paths'],
                  ['Curvature & speed','/docs/curvature'],
                  ['PID basics','/docs/pid'],
                  ['State/Action','/docs/rl'],
                  ['Overtaking lanes','/docs/lanes'],
                  ['Slip & grip','/docs/slip'],
                ].map(([t,href])=>(
                  <button key={t} onClick={go(href)}
                          className="px-3 py-1.5 text-xs rounded-full border border-white/15 hover:border-white/40 hover:bg-white/5">
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <Button size="md" onClick={go('/docs')}>Start mini-course</Button>
              </div>
            </Card>
          </section>

          {/* Bottom CTA */}
          <section className="max-w-7xl mx-auto px-6 mt-14 mb-16 text-center">
            <h3 className="text-2xl md:text-3xl font-black mb-3">Plug in your code and chase the podium.</h3>
            <p className="text-slate-300/90 mb-6">Open the editor, pick a preset, and iterate—every lap is feedback.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={go('/editor')} className="min-w-[180px]">Open Algorithm Editor</Button>
              <Button variant="lime" onClick={go('/race')} className="min-w-[160px]">Quick Race</Button>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center text-slate-400">
            Track’s hot. Engines ready. <span className="text-fuchsia-400 font-bold">Build. Race. Learn.</span>
          </div>
        </footer>
      </div>
    </>
  );
}
