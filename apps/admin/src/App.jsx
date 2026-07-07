// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import OverviewScreen from './pages/OverviewScreen';
import StaffScreen from './pages/StaffScreen';
import HospitalsScreen from './pages/HospitalsScreen';
import FleetScreen from './pages/FleetScreen';
import RecordsScreen from './pages/RecordsScreen';
import LoginScreen from './pages/LoginScreen';
import './styles/tokens.css';

function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 'var(--sidebar-width)', flex: 1 }}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/" element={<ProtectedRoute><AdminLayout><OverviewScreen /></AdminLayout></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><AdminLayout><StaffScreen /></AdminLayout></ProtectedRoute>} />
          <Route path="/hospitals" element={<ProtectedRoute><AdminLayout><HospitalsScreen /></AdminLayout></ProtectedRoute>} />
          <Route path="/fleet" element={<ProtectedRoute><AdminLayout><FleetScreen /></AdminLayout></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><AdminLayout><RecordsScreen /></AdminLayout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
