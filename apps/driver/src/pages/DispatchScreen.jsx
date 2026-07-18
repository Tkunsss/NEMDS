// src/pages/DispatchScreen.jsx
import { useState, useEffect, useRef } from 'react';
import { MapPin, LogOut, Navigation} from 'lucide-react';
import {
  getActiveDispatch, markEnRoute, markArrivedScene, markDepartedScene, markArrivedHospital,
  getMyAmbulance, updateAmbulanceLocation
} from '../api/dispatch';
import { useAuth } from '../context/AuthContext';
import CallerLocationMap from '../components/CallerLocationMap';

const SEVERITY_COLORS = {
  critical: 'var(--color-danger)',
  urgent: 'var(--color-action)',
  moderate: '#5FA8E0',
  unknown: 'var(--color-text-faint)'
};

// Maps current call status -> the single next action the driver can take
const NEXT_ACTION = {
  assigned: { label: 'On the way', handler: 'enRoute' },
  en_route: { label: 'Arrived at scene', handler: 'arrivedScene' },
  on_scene: { label: 'Departing scene', handler: 'departedScene' },
  transporting: { label: 'Arrived at hospital', handler: 'arrivedHospital' }
};

export default function DispatchScreen() {
  const { user, logout } = useAuth();
  const [dispatch, setDispatch] = useState(null);
  const [ambulance, setAmbulance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [d, a] = await Promise.all([getActiveDispatch(), getMyAmbulance().catch(() => null)]);
        setDispatch(d);
        setAmbulance(a);
      } catch (err) {
        console.error('Failed to load active dispatch', err);
      } finally {
        setIsLoading(false);
      }
    };

    refresh();
    const interval = setInterval(refresh, 7000);
    return () => clearInterval(interval);
  }, []);

  const isTrackingActive = dispatch?.call_status === 'en_route';

  // Push live GPS to backend only once the driver has marked the case as en route.
  useEffect(() => {
    if (!isTrackingActive || !ambulance || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        updateAmbulanceLocation(ambulance.ambulance_id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isTrackingActive, ambulance]);

  async function handleNextAction() {
    if (!dispatch) return;
    const action = NEXT_ACTION[dispatch.call_status];
    if (!action) return;

    setIsUpdating(true);
    setError(null);
    try {
      if (action.handler === 'enRoute') await markEnRoute(dispatch.dispatch_id);
      if (action.handler === 'arrivedScene') await markArrivedScene(dispatch.dispatch_id);
      if (action.handler === 'departedScene') await markDepartedScene(dispatch.dispatch_id);
      if (action.handler === 'arrivedHospital') await markArrivedHospital(dispatch.dispatch_id);
      
      // Refetch dispatch data after status update
      const [d, a] = await Promise.all([getActiveDispatch(), getMyAmbulance().catch(() => null)]);
      setDispatch(d);
      setAmbulance(a);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-soft)' }}>Loading…</div>;
  }

  if (!dispatch) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header user={user} onLogout={logout} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'var(--color-panel-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-5)' }}>
            <Navigation size={36} color="var(--color-text-faint)" />
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>No active dispatch</h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: 'var(--text-base)' }}>
            You'll be notified the moment dispatch assigns you a call.
          </p>
        </div>
      </div>
    );
  }

  const action = NEXT_ACTION[dispatch.call_status];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} onLogout={logout} />

      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: SEVERITY_COLORS[dispatch.severity] || SEVERITY_COLORS.unknown
          }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: SEVERITY_COLORS[dispatch.severity], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {dispatch.severity}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)', marginLeft: 'auto' }}>
            {dispatch.emergency_id}
          </span>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: 'var(--space-3)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', background: 'var(--color-panel)', marginBottom: 'var(--space-4)'
        }}>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: '2px' }}>ASSIGNED TO</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800 }}>{user?.full_name || 'You'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: '2px' }}>AMBULANCE</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800 }}>{ambulance?.plate_number || `#${dispatch.ambulance_id}`}</p>
          </div>
        </div>

        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-1)', textTransform: 'capitalize' }}>
          {dispatch.emergency_type?.replace('_', ' ')} call
        </h1>
        <p style={{ color: 'var(--color-text-soft)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-5)' }}>
          {dispatch.description || 'No additional details provided.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          {dispatch.call_lat && dispatch.call_lng && (
            <CallerLocationMap
              callId={dispatch.call_id}
              callerConfirmedLat={dispatch.call_lat}
              callerConfirmedLng={dispatch.call_lng}
              destinationLat={dispatch.destination_lat}
              destinationLng={dispatch.destination_lng}
              destinationName={dispatch.destination_hospital_name}
              // Prefer ambulance's latest reported coordinates, fall back to home hospital coords
              driverLat={dispatch.ambulance_current_latitude ?? dispatch.ambulance_lat}
              driverLng={dispatch.ambulance_current_longitude ?? dispatch.ambulance_lng}
              driverName={dispatch.ambulance_hospital_name || 'Starting Hospital'}
            />
          )}
          {dispatch.address_text && (
            <InfoRow icon={MapPin} label="Location" value={dispatch.address_text} />
          )}
          {dispatch.call_lat && dispatch.call_lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${dispatch.call_lat},${dispatch.call_lng}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-4)', background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-md)',
                color: 'var(--color-action)', fontWeight: 700, textDecoration: 'none', minHeight: 'var(--tap-min)'
              }}
            >
              <Navigation size={18} /> Open in Maps
            </a>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: 'var(--space-5)' }}>
        {error && <p style={{ color: 'var(--color-danger)', fontWeight: 600, marginBottom: 'var(--space-3)', textAlign: 'center' }}>{error}</p>}

        {action && (
          <button
            onClick={handleNextAction}
            disabled={isUpdating}
            style={{
              width: '100%', padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)',
              background: 'var(--color-action)', color: '#1A1300', fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: 'var(--text-lg)', minHeight: '72px', opacity: isUpdating ? 0.6 : 1
            }}
          >
            {isUpdating ? 'Updating…' : action.label.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-4)', background: 'var(--color-panel)', borderRadius: 'var(--radius-md)' }}>
      <Icon size={20} color="var(--color-text-faint)" style={{ marginTop: '2px', flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{value}</p>
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>
          Driver{user?.hospital_name ? ` · ${user.hospital_name}` : ''}
        </p>
        <p style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{user?.full_name}</p>
      </div>
      <button onClick={onLogout} style={{ padding: 'var(--space-3)', color: 'var(--color-text-faint)' }} aria-label="Log out">
        <LogOut size={20} />
      </button>
    </header>
  );
}
