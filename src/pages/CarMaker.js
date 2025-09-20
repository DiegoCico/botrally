import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CarCanvas from '../components/car/CarCanvas';
import CarPreview from '../components/car/CarPreview';
import WheelPreview from '../components/car/WheelPreview';
import SpoilerPreview from '../components/car/SpoilerPreview'; // 1. Import SpoilerPreview

// --- FX, Icons, and UI Components (omitted for brevity, no changes needed here) ---
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
    .title-glow {
      text-shadow:
        0 0 10px rgba(99,102,241,.7),
        0 0 24px rgba(168,85,247,.5),
        0 0 60px rgba(236,72,153,.3);
    }
  `}</style>
);
const BodyIcon=({className})=><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 5.5V16"/><path d="M7 16h10"/><path d="m19 12-7-7-7 7"/></svg>;
const WheelIcon=({className})=><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="12" y1="22" x2="12" y2="18"/><line x1="2" y1="12" x2="6" y2="12"/></svg>;
const EngineIcon=({className})=><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20V10"/><path d="M12 10V4.5A2.5 2.5 0 0 1 14.5 2h0A2.5 2.5 0 0 1 17 4.5V10"/><path d="M12 10V4.5A2.5 2.5 0 0 0 9.5 2h0A2.5 2.5 0 0 0 7 4.5V10"/><path d="M7 10h10"/><path d="M7 10v10"/><path d="M17 10v10"/><path d="M3 16h2"/><path d="M19 16h2"/></svg>;
const SpoilerIcon=({className})=><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 13.21a3.5 3.5 0 0 1 0-2.42L3.58 6.5a2 2 0 0 1 1.79-1.08h13.26a2 2 0 0 1 1.79 1.08l1.58 4.29a3.5 3.5 0 0 1 0 2.42L20.42 17.5a2 2 0 0 1-1.79 1.08H5.37a2 2 0 0 1-1.79-1.08Z"/><path d="M6 18h12"/><path d="M8.5 12V2h7v10"/></svg>;
const Card=({children,className='',onClick})=><div onClick={onClick} className={`p-5 md:p-6 bg-white/5 border rounded-3xl backdrop-blur-sm hover:translate-y-[-2px] hover:shadow-xl transition-all ${className}`}>{children}</div>;
const Button=({onClick,children,variant='neon',size='lg',className=''})=>{const base='inline-flex items-center justify-center font-extrabold rounded-2xl transition-all duration-200';const sizes={md:'px-5 py-2.5 text-sm',lg:'px-7 py-3.5 text-base md:text-lg'};const variants={neon:'relative text-white border-2 border-fuchsia-500/60 hover:border-fuchsia-300 '+'shadow-[0_0_28px_rgba(236,72,153,.35)] hover:shadow-[0_0_40px_rgba(236,72,153,.55)] '+'after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-r after:from-fuchsia-500/20 after:to-indigo-500/20 after:-z-10',ghost:'text-slate-200 hover:text-white hover:scale-105',lime:'text-black bg-lime-400 hover:bg-lime-300 border-2 border-lime-300 '+'shadow-[0_0_20px_rgba(163,230,53,.35)]'};return(<button onClick={onClick} className={[base,sizes[size],variants[variant],className].join(' ')}>{children}</button>);};

const partsData = {
  body: [
    { id: 'mk1', name: 'Racer MK1', stats: { speed: 5, acceleration: 7, handling: 8 }, bodyColor: 0xc0455e },
    { id: 'blue', name: 'Blue Bullet', stats: { speed: 5, acceleration: 7, handling: 8 }, bodyColor: 0x3366ff },
    { id: 'green', name: 'Eco Rider', stats: { speed: 5, acceleration: 7, handling: 8 }, bodyColor: 0x33cc66 },
  ],
  wheels: [
    { id: 'standard', name: 'Standard Slicks', stats: { speed: 0, acceleration: 1, handling: 1 } },
    { id: 'offroad', name: 'Off-Road Grips', stats: { speed: -1, acceleration: -1, handling: 3 } },
    { id: 'slim', name: 'Slim Racers', stats: { speed: 2, acceleration: 0, handling: -1 } },
  ],
  engine: [
    { id: 'v4', name: 'Standard V4', stats: { speed: 5, acceleration: 6, handling: 0 }, icon: '⚙️' },
    { id: 'v8', name: 'Heavy V8', stats: { speed: 8, acceleration: 4, handling: -2 }, icon: '🔥' },
    { id: 'electric', name: 'Supercharged EV', stats: { speed: 6, acceleration: 9, handling: 1 }, icon: '⚡' },
  ],
  spoiler: [
    { id: 'none', name: 'No Spoiler', stats: { speed: 1, acceleration: 0, handling: -1 } },
    { id: 'ducktail', name: 'Ducktail', stats: { speed: 0, acceleration: 0, handling: 2 } },
    { id: 'gtwing', name: 'GT Wing', stats: { speed: -1, acceleration: 1, handling: 4 } },
  ]
};

const categories = [
  { id: 'body', name: 'Body', icon: <BodyIcon className="w-6 h-6" /> },
  { id: 'wheels', name: 'Wheels', icon: <WheelIcon className="w-6 h-6" /> },
  { id: 'engine', name: 'Engine', icon: <EngineIcon className="w-6 h-6" /> },
  { id: 'spoiler', name: 'Spoiler', icon: <SpoilerIcon className="w-6 h-6" /> },
];

export default function CarMaker() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('body');
  const [selectedParts, setSelectedParts] = useState({
    body: 'mk1',
    wheels: 'standard',
    engine: 'v4',
    spoiler: 'none',
  });

  // Handle lobby parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyCode = urlParams.get('code');
  const playerRole = urlParams.get('role'); // 'p1' (host) or 'p2' (joiner)
  const aiMode = urlParams.get('mode') === 'ai'; // AI opponent mode
  const isMultiplayer = lobbyCode && playerRole;
  const isAI = aiMode;

  const handleSelectPart = (category, partId) => {
    setSelectedParts(prev => ({ ...prev, [category]: partId }));
  };

  const totalStats = useMemo(() => {
    return Object.entries(selectedParts).reduce((acc, [category, partId]) => {
      const part = partsData[category].find(p => p.id === partId);
      if (part) {
        acc.speed += part.stats.speed;
        acc.acceleration += part.stats.acceleration;
        acc.handling += part.stats.handling;
      }
      return acc;
    }, { speed: 0, acceleration: 0, handling: 0 });
  }, [selectedParts]);

  const StatBar = ({ label, value }) => (
    <div>
      <div className="flex justify-between items-center mb-1 text-sm">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="font-bold text-indigo-300">{value} / 25</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${(value / 25) * 100}%` }}></div>
      </div>
    </div>
  );

  return (
  <>
    <FX />
    <div className="relative min-h-screen text-slate-100 font-sans selection:bg-fuchsia-500/40">
      <div className="arcade-grid" /><div className="scan" />
      <header className="relative z-10 flex justify-between items-center max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg animate-pulse"><svg width="22" height="22" viewBox="0 0 24 24" stroke="white" fill="none" strokeWidth="2"><path d="M7 17h10" /><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M3 12l2-4c.3-.6.9-1 1.6-1h6c.6 0 1.3.3 1.7.7L16 10c0 0 3 .6 4.5 1.1 1 .3 1.5 1.1 1.5 2v3c0 .6-.4 1-1 1h-2"/></svg></div>
          <div className="text-2xl font-black tracking-widest">BotRally</div>
        </div>
      </header>
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 md:pt-14 grid md:grid-cols-[1.2fr_.8fr] gap-8">
        <div className="flex flex-col gap-6">
          <div className="w-full h-[500px] md:h-[600px] bg-slate-800/20 border border-fuchsia-500/30 rounded-3xl flex items-center justify-center shadow-lg">
            <CarCanvas
              bodyColor={partsData.body.find(b => b.id === selectedParts.body).bodyColor}
              wheelType={selectedParts.wheels}
              spoilerType={selectedParts.spoiler} // 3. Pass the selected spoiler to the canvas
            />
          </div>
          <div className="text-center">
            <h1 className="title-glow text-4xl font-black mb-1">{partsData.body.find(b => b.id === selectedParts.body).name}</h1>
            <p className="text-fuchsia-300 font-bold">Standard Edition</p>
          </div>
        </div>
        <aside className="flex flex-col gap-6">
          <Card className="text-center border-white/10">
            <h2 className="text-2xl font-bold mb-4">Customize Your Kart</h2>
            <div className="grid grid-cols-4 gap-2 bg-slate-800/20 p-2 rounded-xl">
              {categories.map(cat => (<button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeCategory === cat.id ? 'bg-fuchsia-500/40 shadow-[0_0_16px_rgba(236,72,153,.4)]' : 'hover:bg-slate-700/40'}`}>{cat.icon}<span className="text-xs mt-1">{cat.name}</span></button>))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {partsData[activeCategory].map(part => (
                <Card key={part.id} onClick={() => handleSelectPart(activeCategory, part.id)} className={`cursor-pointer ${selectedParts[activeCategory] === part.id ? 'border-fuchsia-400/80 shadow-[0_0_16px_rgba(236,72,153,.4)]' : 'border-white/10 hover:border-fuchsia-300/60'}`}>
                  <div className="flex flex-col items-center text-center">
                    {/* 2. Update the parts grid rendering logic */}
                    {activeCategory === 'body' ? (
                      <CarPreview bodyColor={part.bodyColor} />
                    ) : activeCategory === 'wheels' ? (
                      <WheelPreview wheelType={part.id} />
                    ) : activeCategory === 'spoiler' ? (
                      <SpoilerPreview spoilerType={part.id} />
                    ) : (
                      <span className="text-4xl mb-2">{part.icon}</span>
                    )}
                    <p className="font-black text-fuchsia-300 mt-1">{part.name}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <h3 className="text-xl font-black text-center title-glow mb-2">Performance Stats</h3>
              <StatBar label="Top Speed" value={totalStats.speed} />
              <StatBar label="Acceleration" value={totalStats.acceleration} />
              <StatBar label="Handling" value={totalStats.handling} />
            </div>
            <div className="mt-6">
              {isMultiplayer ? (
                <div className="space-y-3">
                  <div className="text-center text-sm text-slate-300">
                    {playerRole === 'p1' ? '🏆 Host' : '🎮 Player 2'} • Code: <span className="font-mono text-fuchsia-300">{lobbyCode}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/carBlocks?code=${encodeURIComponent(lobbyCode)}&role=${playerRole}&car=${encodeURIComponent(JSON.stringify(selectedParts))}`)}
                  >
                    Code your car! 🏁
                  </Button>
                </div>
              ) : isAI ? (
                <div className="space-y-3">
                  <div className="text-center text-sm text-slate-300">
                    🤖 <span className="text-cyan-300 font-bold">AI Opponent Mode</span> 🤖
                  </div>
                  <div className="text-center text-xs text-slate-400">
                    Code your algorithm and race against Cerebras AI
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/carBlocks?mode=ai&car=${encodeURIComponent(JSON.stringify(selectedParts))}`)}
                  >
                    Code vs AI! 🤖
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => navigate(`/carBlocks?car=${encodeURIComponent(JSON.stringify(selectedParts))}`)}
                >
                  Save & Race 🏁
                </Button>
              )}
            </div>
          </Card>
        </aside>
      </main>
      <footer className="mt-12 border-t border-white/10 text-center py-6"><div className="text-slate-400">Build. Customize. Race. <span className="text-fuchsia-400 font-bold">BotRally</span></div></footer>
    </div>
  </>
  );
}