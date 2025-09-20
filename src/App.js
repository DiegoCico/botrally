import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TrackViewerPage from './pages/TrackViewer';
import Home from './pages/Home';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trackViewer" element={<TrackViewerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
