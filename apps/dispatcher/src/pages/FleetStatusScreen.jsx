// src/pages/FleetStatusScreen.jsx
import { useState, useEffect } from 'react';
import { listAmbulances } from '../api/dispatch';

const STATUS_COLORS = {
  available: 'var(--color-success)',
  dispatched: 'var(--color-urgent)',
  en_route: 'var(--color-moderate)',
  at_scene: 'var(--color-moderate)',
  transporting: 'var(--color-critical)',
  out_of_service: 'var(--color-text-faint)'
};

export default function FleetStatusScreen() {
  const [ambulances, setAmbulances] = useState([]);

  useEffect(() => {
    listAmbulances().then(setAmbulances).catch(console.error);
    const interval = setInterval(() => listAmbulances().then(setAmbulances).catch(console.error), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-5)' }}>Fleet status</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
        {ambulances.map((amb) => (
          <div key={amb.ambulance_id} style={{
            padding: 'var(--space-4)', background: 'var(--color-panel)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontWeight: 700 }}>{amb.plate_number}</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[amb.status] }} />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'capitalize' }}>{amb.vehicle_type}</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: 'var(--space-2)', textTransform: 'capitalize', color: STATUS_COLORS[amb.status] }}>
              {amb.status.replace('_', ' ')}
            </p>
          </div>
        ))}
      </div>

      {ambulances.length === 0 && (
        <p style={{ color: 'var(--color-text-faint)' }}>No ambulances registered yet.</p>
      )}
    </div>
  );
}
