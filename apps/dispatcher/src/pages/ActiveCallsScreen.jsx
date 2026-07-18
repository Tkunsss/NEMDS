// src/pages/ActiveCallsScreen.jsx
import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
import { listCalls } from '../api/calls';
import { createDispatch, listAvailableAmbulancesWithDriver } from '../api/dispatch';
import { getNearestAmbulances } from '../api/proximity';
import SeverityBadge from '../components/SeverityBadge';
import CallerLocationMap from '../components/CallerLocationMap';
import { parseCambodiaDate } from '../utils/time';

const SEVERITY_ORDER = { critical: 0, urgent: 1, moderate: 2, unknown: 3 };

function timeAgo(dateStr) {
  const date = parseCambodiaDate(dateStr);
  if (!date || Number.isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function ActiveCallsScreen() {
  const [calls, setCalls] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('active');

  const refreshCalls = useCallback(async () => {
    try {
      const callsData = await listCalls(view);
      setCalls(callsData.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]));
    } catch (err) {
      console.error('Failed to load calls', err);
    }
  }, [view]);

  useEffect(() => {
    const t = setTimeout(() => { refreshCalls(); }, 0);
    const interval = setInterval(refreshCalls, 8000); // poll until Socket.io live push is wired in
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [refreshCalls]);

  // Whenever a call is selected, load ambulances + hospitals sorted by
  // distance FROM THAT CALL'S location — this is the nearest-first behavior.
  // Falls back to the flat available list if the call has no coordinates.
  useEffect(() => {
    if (!selectedCall) {
      const t = setTimeout(() => { setAmbulances([]); }, 0);
      return () => clearTimeout(t);
    }

    async function loadNearby() {
      try {
        if (selectedCall.latitude && selectedCall.longitude) {
          const amb = await getNearestAmbulances(selectedCall.latitude, selectedCall.longitude);
          // If no ambulances have live GPS positions, fall back to the flat
          // available-with-driver list so dispatchers can still assign ambulances.
          if (!amb || amb.length === 0) {
            const fallbackAmb = await listAvailableAmbulancesWithDriver();
            setAmbulances(fallbackAmb);
          } else {
            setAmbulances(amb);
          }
        } else {
          const amb = await listAvailableAmbulancesWithDriver();
          setAmbulances(amb);
        }
      } catch (err) {
        console.error('Failed to load nearby ambulances', err);
      }
    }
    loadNearby();
  }, [selectedCall]);

  async function handleDispatch() {
    if (!selectedCall || !selectedAmbulance) return;
    setIsDispatching(true);
    setError(null);
    try {
      await createDispatch({
        call_id: selectedCall.call_id,
        ambulance_id: Number(selectedAmbulance)
      });
      setSelectedCall(null);
      setSelectedAmbulance('');
      refreshCalls();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Dispatch failed');
    } finally {
      setIsDispatching(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Dispatcher cases</h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <button
                onClick={() => { setSelectedCall(null); setSelectedAmbulance(''); setView('active'); }}
                style={{
                  padding: '6px 10px', borderRadius: '999px', border: view === 'active' ? '1px solid var(--color-moderate)' : '1px solid var(--color-border)',
                  background: view === 'active' ? 'var(--color-panel-raised)' : 'transparent', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Active
              </button>
              <button
                onClick={() => { setSelectedCall(null); setSelectedAmbulance(''); setView('history'); }}
                style={{
                  padding: '6px 10px', borderRadius: '999px', border: view === 'history' ? '1px solid var(--color-moderate)' : '1px solid var(--color-border)',
                  background: view === 'history' ? 'var(--color-panel-raised)' : 'transparent', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Hospital history
              </button>
            </div>
          </div>
          <span style={{ color: 'var(--color-text-soft)', fontSize: 'var(--text-sm)' }}>
            {view === 'history' ? `${calls.length} historical cases` : `${calls.length} in queue`}
          </span>
        </div>

        {calls.length === 0 && (
          <p style={{ color: 'var(--color-text-faint)', padding: 'var(--space-6)', textAlign: 'center' }}>
            {view === 'history' ? 'No historical cases for this hospital yet.' : 'No active emergency calls right now.'}
          </p>
        )}

        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {calls.map((call) => {
            const cfg = { critical: 'var(--color-critical)', urgent: 'var(--color-urgent)', moderate: 'var(--color-moderate)', unknown: 'var(--color-unknown)' };
            return (
              <button
                key={call.call_id}
                onClick={() => { setSelectedCall(call); setSelectedAmbulance(''); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  textAlign: 'left', padding: 'var(--space-4)',
                  background: selectedCall?.call_id === call.call_id ? 'var(--color-panel-raised)' : 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${cfg[call.severity] || cfg.unknown}`,
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{call.emergency_id}</span>
                    <SeverityBadge severity={call.severity} />
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)', marginBottom: 'var(--space-1)', textTransform: 'capitalize' }}>
                    {call.emergency_type.replace('_', ' ')} · {call.status.replace('_', ' ')}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                    {call.caller_phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                        <Phone size={12} /> {call.caller_phone}
                      </span>
                    )}
                    {call.address_text && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                        <MapPin size={12} /> {call.address_text}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
                  <Clock size={12} /> {timeAgo(call.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dispatch panel */}
      {selectedCall && (
        <div style={{ width: '340px', borderLeft: '1px solid var(--color-border)', background: 'var(--color-panel)', padding: 'var(--space-5)', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            {view === 'history' ? `History — Call #${selectedCall.call_id}` : `Dispatch — Call #${selectedCall.call_id}`}
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-mono)' }}>{selectedCall.emergency_id}</p>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: '4px' }}>DESCRIPTION</p>
            <p style={{ fontSize: 'var(--text-sm)' }}>{selectedCall.description || 'No description provided.'}</p>
          </div>

          {view === 'history' ? (
            <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', background: 'var(--color-panel-raised)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: '4px' }}>CASE STATUS</p>
              <p style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{selectedCall.status.replace('_', ' ')}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', marginTop: 'var(--space-2)' }}>
                This is a completed or cancelled case from your hospital's history.
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: '4px' }}>LIVE LOCATION</p>
                <CallerLocationMap
                  callId={selectedCall.call_id}
                  ambulanceId={selectedAmbulance || undefined}
                  fallbackLat={selectedCall.latitude}
                  fallbackLng={selectedCall.longitude}
                />
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 'var(--space-2)' }}>NEAREST AMBULANCES (WITH DRIVER)</p>
                {ambulances.length === 0 && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)' }}>
                    No crewed ambulances available. Assign a driver to an ambulance on the Crew screen first.
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {error && (
                    <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>{error}</p>
                  )}
                  {ambulances.map((amb) => (
                    <button
                      key={amb.ambulance_id}
                      onClick={() => setSelectedAmbulance(String(amb.ambulance_id))}
                      style={{
                        padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                        border: selectedAmbulance === String(amb.ambulance_id) ? '1.5px solid var(--color-moderate)' : '1px solid var(--color-border)',
                        background: selectedAmbulance === String(amb.ambulance_id) ? 'var(--color-panel-raised)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{amb.plate_number}</p>
                        {amb.distance_km != null && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-moderate)', fontWeight: 700 }}>{amb.distance_km} km</span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', textTransform: 'capitalize' }}>{amb.vehicle_type}</p>
                      {amb.driver_name && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', marginTop: '2px' }}>Driver: {amb.driver_name}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 'var(--space-2)' }}>
                  ROUTED HOSPITAL
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)' }}>
                  {selectedCall.assigned_hospital_id ? `Hospital #${selectedCall.assigned_hospital_id}` : 'No hospital assigned yet'}
                </p>
              </div>

              {error && <p style={{ color: 'var(--color-critical)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{error}</p>}

              <button
                onClick={handleDispatch}
                disabled={!selectedAmbulance || isDispatching}
                style={{
                  width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-critical)', color: '#fff', fontWeight: 700,
                  opacity: (!selectedAmbulance || isDispatching) ? 0.5 : 1
                }}
              >
                {isDispatching ? 'Dispatching…' : 'Dispatch ambulance'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
