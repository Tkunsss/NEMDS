// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import HomeScreen from './pages/HomeScreen';
import ConfirmLocationScreen from './pages/ConfirmLocationScreen';
import TrackingScreen from './pages/TrackingScreen';
import HistoryScreen from './pages/HistoryScreen';
import './styles/tokens.css';

function Layout() {
  const location = useLocation();
  const showNav = ['/', '/history'].includes(location.pathname);

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--color-paper)', position: 'relative' }}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/confirm-location" element={<ConfirmLocationScreen />} />
        <Route path="/tracking/:emergencyId" element={<TrackingScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
