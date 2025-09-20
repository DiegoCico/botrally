import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CarCanvas from '../components/car/CarCanvas';
import CarPreview from '../components/car/CarPreview';

// --- Icon Components (Inline SVG) ---
const BodyIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
    <path d="M5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
    <path d="M12 5.5V16"/>
    <path d="M7 16h10"/>
    <path d="m19 12-7-7-7 7"/>
  </svg>
);

const WheelIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="2" x2="12" y2="6"/>
    <line x1="22" y1="12" x2="18" y2="12"/>
    <line x1="12" y1="22" x2="12" y2="18"/>
    <line x1="2" y1="12" x2="6" y2="12"/>
  </svg>
);

const EngineIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20V10"/>
    <path d="M12 10V4.5A2.5 2.5 0 0 1 14.5 2h0A2.5 2.5 0 0 1 17 4.5V10"/>
    <path d="M12 10V4.5A2.5 2.5 0 0 0 9.5 2h0A2.5 2.5 0 0 0 7 4.5V10"/>
    <path d="M7 10h10"/>
    <path d="M7 10v10"/>
    <path d="M17 10v10"/>
    <path d="M3 16h2"/>
    <path d="M19 16h2"/>
  </svg>
);

const SpoilerIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 13.21a3.5 3.5 0 0 1 0-2.42L3.58 6.5a2 2 0 0 1 1.79-1.08h13.26a2 2 0 0 1 1.79 1.08l1.58 4.29a3.5 3.5 0 0 1 0 2.42L20.42 17.5a2 2 0 0 1-1.79 1.08H5.37a2 2 0 0 1-1.79-1.08Z"/>
    <path d="M6 18h12"/>
    <path d="M8.5 12V2h7v10"/>
  </svg>
);

const ArrowLeftIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);


// --- UI Components ---
const Card = ({ children, className, onClick }) => (
  <div
    className={`p-4 bg-slate-800/80 border-2 rounded-2xl backdrop-blur-sm transition-all duration-200 shadow-lg cursor-pointer ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

const Button = ({ onClick, children, variant = 'default', className }) => {
  const baseClasses = 'font-bold rounded-xl transition-all duration-200 shadow-lg inline-flex items-center justify-center text-center px-6 py-3';
  const variantClasses = {
    default: 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105',
    outline: 'border-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent',
    ghost: 'text-slate-300 hover:bg-slate-700/50 bg-transparent shadow-none',
  };
  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Icons omitted for brevity ---

// --- Mock Data ---
const partsData = {
  body: [
    { id: 'mk1', name: 'Racer MK1', stats: { speed: 5, acceleration: 7, handling: 8 }, bodyColor: 0xc0455e },
    { id: 'blue', name: 'Blue Bullet', stats: { speed: 7, acceleration: 4, handling: 5 }, bodyColor: 0x3366ff },
    { id: 'green', name: 'Eco Rider', stats: { speed: 8, acceleration: 6, handling: 6 }, bodyColor: 0x33cc66 },
  ],
  wheels: [
    { id: 'standard', name: 'Standard Slicks', stats: { speed: 0, acceleration: 1, handling: 1 }, icon: '⚫' },
    { id: 'offroad', name: 'Off-Road Grips', stats: { speed: -1, acceleration: -1, handling: 3 }, icon: '🚜' },
    { id: 'slim', name: 'Slim Racers', stats: { speed: 2, acceleration: 0, handling: -1 }, icon: '💿' },
  ],
  engine: [
    { id: 'v4', name: 'Standard V4', stats: { speed: 5, acceleration: 6, handling: 0 }, icon: '⚙️' },
    { id: 'v8', name: 'Heavy V8', stats: { speed: 8, acceleration: 4, handling: -2 }, icon: '🔥' },
    { id: 'electric', name: 'Supercharged EV', stats: { speed: 6, acceleration: 9, handling: 1 }, icon: '⚡' },
  ],
  spoiler: [
    { id: 'none', name: 'No Spoiler', stats: { speed: 1, acceleration: 0, handling: -1 }, icon: '🚫' },
    { id: 'ducktail', name: 'Ducktail', stats: { speed: 0, acceleration: 0, handling: 2 }, icon: '🦆' },
    { id: 'gtwing', name: 'GT Wing', stats: { speed: -1, acceleration: 1, handling: 4 }, icon: '🏁' },
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
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans flex flex-col md:flex-row">
      {/* --- Left Side: 3D Viewer --- */}
      <main className="flex-grow md:w-2/3 p-4 md:p-8 flex flex-col relative">
        <div className="absolute top-4 left-4 z-10">
          <Button onClick={() => navigate('/')} variant="ghost">
            <ArrowLeftIcon className="w-5 h-5 mr-2" /> Back to Menu
          </Button>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="w-full h-full max-w-4xl max-h-[500px] bg-slate-800/50 rounded-3xl border-2 border-slate-700 flex items-center justify-center">
            <CarCanvas
              bodyColor={partsData.body.find(b => b.id === selectedParts.body).bodyColor}
              wheelType={selectedParts.wheels}
            />
          </div>
        </div>
        <div className="flex-shrink-0 p-4 text-center">
          <h1 className="text-3xl font-black">{partsData.body.find(b => b.id === selectedParts.body).name}</h1>
          <p className="text-indigo-400">Standard Edition</p>
        </div>
      </main>

      {/* --- Right Side: Customization Panel --- */}
      <aside className="w-full md:w-1/3 bg-slate-900/80 border-l-2 border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-center">Customize Your Kart</h2>

        {/* Category Selector */}
        <div className="grid grid-cols-4 gap-2 bg-slate-800 p-2 rounded-xl">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeCategory === cat.id ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
            >
              {cat.icon}
              <span className="text-xs mt-1">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Parts Grid */}
        <div className="flex-grow grid grid-cols-2 gap-4">
          {partsData[activeCategory].map(part => (
            <Card
              key={part.id}
              onClick={() => handleSelectPart(activeCategory, part.id)}
              className={selectedParts[activeCategory] === part.id ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-500'}
            >
              <div className="flex flex-col items-center text-center">
                {activeCategory === 'body' ? (
                  <CarPreview bodyColor={part.bodyColor} />
                ) : activeCategory === 'wheels' ? (
                  <span className="text-4xl mb-2">{part.icon}</span>
                ) : (
                  <span className="text-4xl mb-2">{part.icon}</span>
                )}
                <p className="font-bold">{part.name}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Performance Stats */}
        <div className="flex-shrink-0 space-y-4">
          <h3 className="text-xl font-bold text-center">Performance Stats</h3>
          <StatBar label="Top Speed" value={totalStats.speed} />
          <StatBar label="Acceleration" value={totalStats.acceleration} />
          <StatBar label="Handling" value={totalStats.handling} />
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 mt-4">
          <Button className="w-full">Save & Race 🏁</Button>
        </div>
      </aside>
    </div>
  );
}
