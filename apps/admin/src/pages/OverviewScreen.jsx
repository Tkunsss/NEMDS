// src/pages/OverviewScreen.jsx
import { useState, useEffect } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { getStats, restoreUser, restoreHospital, permanentDeleteUser, permanentDeleteHospital } from '../api/admin';
import { restoreAmbulance as restoreFleetAmbulance, permanentDeleteAmbulance } from '../api/ambulances';
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

  async function handleRestore(item) {
    try {
      if (item.type === 'user') {
        await restoreUser(item.user_id);
      } else if (item.type === 'hospital') {
        await restoreHospital(item.hospital_id);
      } else if (item.type === 'ambulance') {
        await restoreFleetAmbulance(item.ambulance_id);
      }
      refresh();
    } catch (err) {
      console.error('restore failed', err);
    }
  }

  async function handlePermanentDelete(item) {
    if (!window.confirm('Permanently delete this item? This cannot be undone.')) return;
    try {
      if (item.type === 'user') {
        await permanentDeleteUser(item.user_id);
      } else if (item.type === 'hospital') {
        await permanentDeleteHospital(item.hospital_id);
      } else if (item.type === 'ambulance') {
        await permanentDeleteAmbulance(item.ambulance_id);
      }
      refresh();
    } catch (err) {
      console.error('permanent delete failed', err);
    }
  }

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
