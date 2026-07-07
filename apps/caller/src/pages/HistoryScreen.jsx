// src/pages/HistoryScreen.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Inbox } from 'lucide-react';
import { getCallHistory } from '../api/calls';
import { getStoredEmergencyIds } from '../utils/localHistory';

const STATUS_LABELS = {
  pending: 'Pending', assigned: 'Assigned', en_route: 'En route',
  on_scene: 'On scene', transporting: 'Transporting', completed: 'Completed', cancelled: 'Cancelled'
};

function statusColor(status) {
  if (status === 'completed') return 'var(--color-success)';
  if (status === 'cancelled') return 'var(--color-ink-soft)';
  return 'var(--color-emergency)';
}

export default function HistoryScreen() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ids = getStoredEmergencyIds();
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }
    getCallHistory(ids)
      .then(setCalls)
      .catch((err) => console.error('Failed to load history', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100%', paddingBottom: '90px' }}>
      <header style={{ padding: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Call history</h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', marginTop: '4px' }}>
          Stored on this device only
        </p>
      </header>

      {isLoading && (
        <p style={{ textAlign: 'center', color: 'var(--color-ink-soft)', padding: 'var(--space-6)' }}>Loading…</p>
      )}

      {!isLoading && calls.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-5)' }}>
          <Inbox size={40} color="var(--color-line)" style={{ marginBottom: 'var(--space-3)' }} />
          <p style={{ color: 'var(--color-ink-soft)', fontWeight: 600 }}>No emergency calls yet</p>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            Calls you submit from this device will show up here
          </p>
        </div>
      )}

      <div style={{ padding: '0 var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {calls.map((call) => (
          <button
            key={call.call_id}
            onClick={() => navigate(`/tracking/${call.emergency_id}`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-4)', background: 'var(--color-surface)',
              border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)', textAlign: 'left'
            }}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>
                {call.emergency_id} · {call.emergency_type.replace('_', ' ')}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', marginTop: '2px' }}>
                {new Date(call.created_at).toLocaleString()}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: statusColor(call.status), marginTop: '6px' }}>
                {STATUS_LABELS[call.status] || call.status}
              </p>
            </div>
            <ChevronRight size={20} color="var(--color-ink-soft)" />
          </button>
        ))}
      </div>
    </div>
  );
}
