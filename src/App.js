import { BrowserRouter, Router, Routes, Route } from 'react-router-dom';
import TrackViewerPage from './pages/TrackViewer';
import Home from './pages/Home';
import CarMaker from './pages/CarMaker';
import CarDemoPage from './pages/CarDemoPage';
import logo from './logo.svg';
import CarViewerPage from './pages/CarViewer';
import CarBlocksPage from './pages/CarBlocksPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trackViewer" element={<TrackViewerPage />} />
        <Route path='/carMaker' element={<CarMaker />} />
        <Route path='/carViewer' element={<CarViewerPage />} />
        <Route path="/carDemo" element={<CarDemoPage />} />
        <Route path='/carBlocks' element={<CarBlocksPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;