import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- UI Components (Recreated to remove dependency errors) ---

// A flexible component for badges.
const Badge = ({ children, className }) => (
  <div className={`inline-block px-4 py-1.5 text-sm font-bold rounded-full ${className}`}>
    {children}
  </div>
);

// A container component for cards.
const Card = ({ children, className }) => (
  <div className={`p-8 bg-white/5 border-2 rounded-3xl backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-xl ${className}`}>
    {children}
  </div>
);

// A button component with different visual styles (variants).
const Button = ({ children, variant = 'default', size = 'md', className }) => {
  const baseClasses = 'font-bold rounded-2xl hover:scale-105 transition-all duration-200 shadow-lg inline-flex items-center justify-center';

  const sizeClasses = {
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    default: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    outline: 'border-2 border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-white bg-transparent',
    ghost: 'text-gray-200 hover:text-indigo-400 bg-transparent shadow-none',
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </button>
  );
};


// --- Icon Components (Inline SVG to replace lucide-react) ---

const CarIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><path d="M7 17h10"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);
const PlayIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const SettingsIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const ZapIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const UsersIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const TrophyIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);


// --- Main App Component ---

export default function App() {
    const navigate = useNavigate();
  // Define colors for use in components
  const colors = {
    background: '#0F172A', // slate-900
    foreground: '#F8FAFC', // slate-50
    card: 'rgba(30, 41, 59, 0.5)', // slate-800 with transparency
    primary: '#6366F1', // indigo-500
    'primary-foreground': '#F8FAFC', // slate-50
    secondary: '#EC4899', // pink-500
    'secondary-foreground': '#F8FAFC', // slate-50
    accent: '#10B981', // emerald-500
    'accent-foreground': '#F8FAFC', // slate-50
    muted: '#94A3B8', // slate-400
    border: '#334155', // slate-700
  };

  const handleNavigate = (route) => {
    navigate(route)
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans relative overflow-hidden">
      {/* Background Animated Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-16 h-16 bg-indigo-500/10 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-12 h-12 bg-pink-500/10 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-emerald-500/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/3 w-8 h-8 bg-red-500/10 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
      </div>

      <header className="relative z-10 p-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3 animate-bounce-in">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center animate-wiggle">
              <CarIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">BotRally</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost">Garage</Button>
            <Button variant="ghost">Leaderboard</Button>
            <Button variant="ghost">Community</Button>
            <Button variant="outline" className="border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-white">
              Sign In
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 px-6 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8 animate-bounce-in" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Build Your <span className="block text-indigo-400 animate-float" style={{ animationDelay: '0.5s' }}>Dream Kart</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Mix, match, and race with endless customization possibilities in the most cartoony racing adventure ever!
            </p>
          </div>

          <div className="mb-12 animate-bounce-in" style={{ animationDelay: '0.4s' }}>
            <div className="relative mx-auto w-full max-w-md h-64 bg-slate-800 rounded-3xl border-4 border-indigo-500/20 overflow-hidden animate-float shadow-2xl">
              <img 
                src="https://placehold.co/600x400/0f172a/6366f1?text=Your+Awesome+Kart!" 
                alt="Cartoony racing kart" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className="bg-indigo-500 text-white font-bold">Modular Design System</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-bounce-in" style={{ animationDelay: '0.6s' }}>
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 animate-wiggle">
              <PlayIcon className="w-6 h-6 mr-2" />
              Start Racing
            </Button>
            <Button onClick={() => handleNavigate('/carMaker')} size="lg" variant="outline" className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white">
              <SettingsIcon className="w-6 h-6 mr-2" />
              Customize Kart
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-indigo-500/20 animate-bounce-in" style={{ animationDelay: '0.8s' }}>
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-float">
                <ZapIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Modular Parts</h3>
              <p className="text-slate-400 leading-relaxed">
                Mix and match engines, wheels, bodies, and boosters to create your perfect racing machine!
              </p>
            </Card>

            <Card className="border-pink-500/20 animate-bounce-in" style={{ animationDelay: '1s' }}>
              <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-float" style={{ animationDelay: '1s' }}>
                <UsersIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Multiplayer Mayhem</h3>
              <p className="text-slate-400 leading-relaxed">
                Race against friends in chaotic multiplayer battles with power-ups and crazy tracks!
              </p>
            </Card>

            <Card className="border-emerald-500/20 animate-bounce-in" style={{ animationDelay: '1.2s' }}>
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-float" style={{ animationDelay: '2s' }}>
                <TrophyIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Championship Mode</h3>
              <p className="text-slate-400 leading-relaxed">
                Climb the leaderboards and unlock exclusive parts in seasonal tournaments!
              </p>
            </Card>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mt-20 py-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            Ready to build the ultimate racing machine?
            <span className="text-indigo-400 font-bold ml-2">Let's go!</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
