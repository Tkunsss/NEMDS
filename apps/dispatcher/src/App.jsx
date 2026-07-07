// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import ActiveCallsScreen from './pages/ActiveCallsScreen';
import CrewScreen from './pages/CrewScreen';
import FleetStatusScreen from './pages/FleetStatusScreen';
import LoginScreen from './pages/LoginScreen';
import './styles/tokens.css';

function ConsoleLayout({ children }) {
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
          <Route path="/" element={
            <ProtectedRoute>
              <ConsoleLayout><ActiveCallsScreen /></ConsoleLayout>
            </ProtectedRoute>
          } />
          <Route path="/crew" element={
            <ProtectedRoute>
              <ConsoleLayout><CrewScreen /></ConsoleLayout>
            </ProtectedRoute>
          } />
          <Route path="/fleet" element={
            <ProtectedRoute>
              <ConsoleLayout><FleetStatusScreen /></ConsoleLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
