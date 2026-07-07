// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DispatchScreen from './pages/DispatchScreen';
import LoginScreen from './pages/LoginScreen';
import './styles/tokens.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh' }}>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={<ProtectedRoute><DispatchScreen /></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
