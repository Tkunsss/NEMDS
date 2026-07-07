// src/pages/CrewScreen.jsx
import { useState, useEffect } from 'react';
import { UserCheck, UserMinus, Truck } from 'lucide-react';
import { listAmbulances } from '../api/dispatch';
import { listCurrentAssignments, listAvailableDrivers, assignDriver, unassignDriver } from '../api/driverAssignments';

export default function CrewScreen() {
  const [ambulances, setAmbulances] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    try {
      const [ambData, assignData, driversData] = await Promise.all([
        listAmbulances(),
        listCurrentAssignments(),
        listAvailableDrivers()
      ]);
      setAmbulances(ambData);
      setAssignments(assignData);
      setAvailableDrivers(driversData);
    } catch (err) {
      console.error('Failed to load crew data', err);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { refresh(); }, 0);
    return () => clearTimeout(t);
  }, []);

  function driverFor(ambulanceId) {
    return assignments.find((a) => a.ambulance_id === ambulanceId);
  }

  async function handleAssign() {
    if (!selectedAmbulance || !selectedDriver) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await assignDriver(Number(selectedDriver), selectedAmbulance);
      setSelectedAmbulance(null);
      setSelectedDriver('');
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign driver');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnassign(ambulanceId) {
    await unassignDriver(ambulanceId);
    refresh();
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Crew assignment</h1>
      <p style={{ color: 'var(--color-text-soft)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
        An ambulance needs an assigned driver before it can be dispatched to a call.
      </p>

      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {ambulances.map((amb) => {
          const assignment = driverFor(amb.ambulance_id);
          const isSelected = selectedAmbulance === amb.ambulance_id;
          return (
            <div key={amb.ambulance_id} style={{
              padding: 'var(--space-4)', background: 'var(--color-panel)',
              border: isSelected ? '1.5px solid var(--color-moderate)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Truck size={20} color="var(--color-text-faint)" />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{amb.plate_number}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'capitalize' }}>
                    {amb.vehicle_type} · {amb.status.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {assignment ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-success)' }}>{assignment.driver_name}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{assignment.driver_phone}</p>
                  </div>
                  <button
                    onClick={() => handleUnassign(amb.ambulance_id)}
                    style={{ padding: 'var(--space-2)', color: 'var(--color-critical)' }}
                    aria-label="Unassign driver"
                  >
                    <UserMinus size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setSelectedAmbulance(amb.ambulance_id); setSelectedDriver(''); setError(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-panel-raised)', color: 'var(--color-moderate)',
                    fontSize: 'var(--text-xs)', fontWeight: 600
                  }}
                >
                  <UserCheck size={14} /> Assign driver
                </button>
              )}

              {isSelected && (
                <div style={{
                  position: 'absolute', marginTop: '60px', right: 'var(--space-6)',
                  background: 'var(--color-panel-raised)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', width: '260px', zIndex: 10
                }} />
              )}
            </div>
          );
        })}
      </div>

      {selectedAmbulance && (
        <div style={{
          marginTop: 'var(--space-5)', padding: 'var(--space-5)', background: 'var(--color-panel)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)'
        }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            Choose a driver for this ambulance
          </p>
          {availableDrivers.length === 0 && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)' }}>
              No unassigned drivers. Create one from the Admin dashboard's Staff accounts screen.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {availableDrivers.map((d) => (
              <button
                key={d.user_id}
                onClick={() => setSelectedDriver(String(d.user_id))}
                style={{
                  textAlign: 'left', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                  border: selectedDriver === String(d.user_id) ? '1.5px solid var(--color-moderate)' : '1px solid var(--color-border)',
                  background: selectedDriver === String(d.user_id) ? 'var(--color-panel-raised)' : 'transparent'
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{d.full_name}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{d.phone_number}</p>
              </button>
            ))}
          </div>
          {error && <p style={{ color: 'var(--color-critical)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={handleAssign}
              disabled={!selectedDriver || isSubmitting}
              style={{
                padding: 'var(--space-3) var(--space-5)', background: 'var(--color-critical)', color: '#fff',
                borderRadius: 'var(--radius-sm)', fontWeight: 700, opacity: (!selectedDriver || isSubmitting) ? 0.5 : 1
              }}
            >
              {isSubmitting ? 'Assigning…' : 'Confirm assignment'}
            </button>
            <button onClick={() => setSelectedAmbulance(null)} style={{ padding: 'var(--space-3) var(--space-5)', color: 'var(--color-text-soft)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
