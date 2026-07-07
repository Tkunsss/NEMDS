// src/pages/FleetScreen.jsx
import { useState, useEffect } from 'react';
import { Plus, X, Truck, Building2, Trash2 } from 'lucide-react';
import { listAmbulances, createAmbulance, deleteAmbulance } from '../api/ambulances';
import { listHospitals } from '../api/admin';

export default function FleetScreen() {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plate_number: '', home_hospital_id: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function refresh() {
    listAmbulances().then(setAmbulances).catch(console.error);
  }

  useEffect(() => {
    refresh();
    listHospitals().then(setHospitals).catch(console.error);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.home_hospital_id) {
      setError('A home hospital is required — an ambulance with no hospital can never be crewed or dispatched');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createAmbulance({ ...form, vehicle_type: 'basic', home_hospital_id: Number(form.home_hospital_id) });
      setShowForm(false);
      setForm({ plate_number: '', home_hospital_id: '' });
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add ambulance');
    } finally {
      setIsSubmitting(false);
    }
  }

  function hospitalName(hospitalId) {
    return hospitals.find((h) => h.hospital_id === hospitalId)?.name;
  }

  async function handleDeleteAmbulance(ambulanceId) {
    if (!window.confirm('Delete this ambulance from fleet? It can be restored within 24 hours.')) return;
    await deleteAmbulance(ambulanceId);
    refresh();
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Ambulance fleet</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)', background: 'var(--color-accent)',
            color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 'var(--text-sm)'
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Register ambulance'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-5)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap'
        }}>
          <input
            placeholder="Plate number" value={form.plate_number} required
            onChange={(e) => setForm((f) => ({ ...f, plate_number: e.target.value }))}
            style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', flex: 1, minWidth: '160px' }}
          />
          <select
            value={form.home_hospital_id}
            onChange={(e) => setForm((f) => ({ ...f, home_hospital_id: e.target.value }))}
            required
            style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', minWidth: '180px' }}
          >
            <option value="">Home hospital…</option>
            {hospitals.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
          </select>
          <button type="submit" disabled={isSubmitting} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'var(--color-success)',
            color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700
          }}>
            {isSubmitting ? 'Adding…' : 'Add'}
          </button>
          {hospitals.length === 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', width: '100%' }}>
              No hospitals exist yet — add one from the Hospitals screen first.
            </p>
          )}
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', width: '100%' }}>{error}</p>}
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        {ambulances.map((a) => (
          <div key={a.ambulance_id} style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <Truck size={16} color="var(--color-accent)" />
              <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{a.plate_number}</p>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', textTransform: 'capitalize' }}>{a.vehicle_type}</p>
            <p style={{ fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: '4px', color: a.home_hospital_id ? 'var(--color-text-soft)' : 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
              <Building2 size={11} /> {hospitalName(a.home_hospital_id) || 'No home hospital'}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginTop: 'var(--space-2)', textTransform: 'capitalize', color: a.status === 'available' ? 'var(--color-success)' : 'var(--color-text-faint)' }}>
              {a.status.replace('_', ' ')}
            </p>
            <button
              onClick={() => handleDeleteAmbulance(a.ambulance_id)}
              style={{
                marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                background: 'transparent', color: 'var(--color-danger)', fontSize: 'var(--text-xs)', fontWeight: 700
              }}
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
