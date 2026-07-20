// src/pages/OverviewScreen.jsx
import { useState, useEffect } from 'react';
import { getStats } from '../api/admin';
import StatCard from '../components/StatCard';

export default function OverviewScreen() {
  const [stats, setStats] = useState(null);

  function refresh() {
    getStats()
      .then(setStats)
      .catch(console.error);
  }

  useEffect(() => {
    refresh();
  }, []);

  // (restore / permanent delete handlers removed — not used in UI)

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-5)' }}>System overview</h1>

      {!stats && <p style={{ color: 'var(--color-text-faint)' }}>Loading stats…</p>}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
          <StatCard label="Total calls" value={stats.total_calls} />
          <StatCard label="Active calls" value={stats.active_calls} accentColor="var(--color-danger)" />
          <StatCard label="Dispatch-ready ambulances" value={`${stats.available_ambulances} / ${stats.total_ambulances}`} accentColor="var(--color-success)" />
          <StatCard label="Dispatchers" value={stats.total_dispatchers} />
          <StatCard label="Drivers" value={stats.total_drivers} />
        </div>
      )}

    </div>
  );
}
