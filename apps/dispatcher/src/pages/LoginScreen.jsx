// src/pages/LoginScreen.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Siren } from 'lucide-react';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [phone_number, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await loginRequest(phone_number, password);
      if (data.role !== 'dispatcher' && data.role !== 'admin') {
        setError('This account is not authorized for the dispatcher console');
        return;
      }
      loginUser(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ width: '340px', padding: 'var(--space-6)', background: 'var(--color-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          <Siren size={24} color="var(--color-critical)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>Dispatcher Console</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <input
            type="tel" placeholder="Phone number" value={phone_number} required
            onChange={(e) => setPhone(e.target.value)}
            style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}
          />
          <input
            type="password" placeholder="Password" value={password} required
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}
          />
          {error && <p style={{ color: 'var(--color-critical)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <button type="submit" disabled={isSubmitting} style={{
            padding: 'var(--space-3)', background: 'var(--color-critical)', color: '#fff',
            borderRadius: 'var(--radius-sm)', fontWeight: 700
          }}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </div>
      </form>
    </div>
  );
}
