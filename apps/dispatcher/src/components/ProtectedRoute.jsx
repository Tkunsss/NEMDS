// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-soft)' }}>Loading…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  // Dispatchers are hospital staff — every screen in this app assumes a
  // hospital_id is present to scope queries. Without one, every list would
  // just silently come back empty, which is confusing. Block clearly instead.
  if (user.role === 'dispatcher' && !user.hospital_id) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>No hospital assigned</h1>
        <p style={{ color: 'var(--color-text-soft)', fontSize: 'var(--text-sm)', maxWidth: '360px', marginBottom: 'var(--space-5)' }}>
          Your dispatcher account isn't linked to a hospital yet. Ask an admin to assign one from the admin dashboard's Staff accounts screen.
        </p>
        <button onClick={logout} style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-critical)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
          Log out
        </button>
      </div>
    );
  }

  return children;
}
