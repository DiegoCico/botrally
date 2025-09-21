import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import TrackViewerPage from './pages/TrackViewer';
import CarMaker from './pages/CarMaker';
import CarDemoPage from './pages/CarDemoPage';
import CarViewerPage from './pages/CarViewer';
import CarBlocksPage from './pages/CarBlocksPage';
import MultiplayerRacePage from './pages/MultiplayerRacePage';
import AIRacePage from './pages/AIRacePage';
import RaceScene from './pages/RaceScene'
import './App.css';

// Temporary stubs so /race and /race/ai don’t 404.
// Replace these with your real pages when ready.
const RacePage = () => <div className="p-6 text-slate-200">Race (player vs player) — coming soon.</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Pages you already have */}
        <Route path="/trackViewer" element={<TrackViewerPage />} />
        <Route path="/carViewer" element={<CarViewerPage />} />
        <Route path="/carDemo" element={<CarDemoPage />} />
        <Route path="/carBlocks" element={<CarBlocksPage />} />

        {/* Needed for StartRaceCTA navigation with ?code=...&role=p1|p2 */}
        <Route path="/carMaker" element={<CarMaker />} />

        {/* AI option & quick race buttons from Home */}
        <Route path="/race" element={<RacePage />} />
        <Route path="/race/ai" element={<AIRacePage />} />
        
        {/* Multiplayer race */}
        <Route path="/multiplayerRace" element={<MultiplayerRacePage />} />
        
        {/* AI race */}
        <Route path="/aiRace" element={<AIRacePage />} />
        <Route path="/raceScene" element={<RaceScene />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
