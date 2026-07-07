// src/pages/LoginScreen.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Truck } from 'lucide-react';

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
      if (data.role !== 'driver') {
        setError('This account is not authorized for the driver app');
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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-panel-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={28} color="var(--color-action)" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>NCEMDS Driver</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <input
            type="tel" placeholder="Phone number" value={phone_number} required
            onChange={(e) => setPhone(e.target.value)}
            style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              background: 'var(--color-panel)', color: 'var(--color-text)', fontSize: 'var(--text-base)', minHeight: 'var(--tap-min)'
            }}
          />
          <input
            type="password" placeholder="Password" value={password} required
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              background: 'var(--color-panel)', color: 'var(--color-text)', fontSize: 'var(--text-base)', minHeight: 'var(--tap-min)'
            }}
          />
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{error}</p>}
          <button type="submit" disabled={isSubmitting} style={{
            padding: 'var(--space-4)', background: 'var(--color-action)', color: '#1A1300',
            borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 'var(--text-base)', minHeight: 'var(--tap-min)'
          }}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </div>
      </form>
    </div>
  );
}
