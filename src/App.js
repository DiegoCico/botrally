import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TrackViewerPage from './pages/TrackViewer';
import Home from './pages/Home';
import CarMaker from './pages/CarMaker';
import logo from './logo.svg';
import CarViewerPage from './pages/CarViewer';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trackViewer" element={<TrackViewerPage />} />
        <Route path='/carMaker' element={<CarMaker />} />
        <Route path='/carViewer' element={<CarViewerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
