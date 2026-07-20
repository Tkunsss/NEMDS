// src/pages/TrackingScreen.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Polyline, useJsApiLoader } from '@react-google-maps/api';
import MapMarker from '../components/MapMarker';
import { io } from 'socket.io-client';
import { CheckCircle2, Circle, Copy, X, Radio } from 'lucide-react';
import { getCallById, cancelEmergencyCall, sendLocationPing, getDispatchForCall, getAmbulanceLocation } from '../api/calls';
import Button from '../components/Button';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../utils/googleMapsConfig';
import { formatCambodiaDateTime } from '../utils/time';

const STAGES = [
  { key: 'pending', label: 'Call received' },
  { key: 'assigned', label: 'Ambulance assigned' },
  { key: 'en_route', label: 'Ambulance en route' },
  { key: 'on_scene', label: 'Arrived at your location' },
  { key: 'transporting', label: 'Transporting to hospital' },
  { key: 'completed', label: 'Complete' }
];

const MAP_CONTAINER_STYLE = { width: '100%', height: '220px' };
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
  ]
};

export default function TrackingScreen() {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [dispatchInfo, setDispatchInfo] = useState(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [lastAmbulanceUpdate, setLastAmbulanceUpdate] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [callerLocation, setCallerLocation] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

const calculateDistanceKm = (origin, destination) => {
    const R = 6371;
    const dLat = (origin.lat - destination.lat) * Math.PI / 180;
    const dLng = (origin.lng - destination.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchCall = useCallback(async () => {
    try {
      const data = await getCallById(emergencyId);
      setCall(data);
    } catch (err) {
      console.error('Failed to fetch call status', err);
    } finally {
      setIsLoading(false);
    }
  }, [emergencyId]);

  const fetchDispatchInfo = useCallback(async () => {
    if (!emergencyId) return;
    try {
      const callData = await getCallById(emergencyId);
      if (!callData?.call_id) return;
      const dispatch = await getDispatchForCall(callData.call_id);
      if (!dispatch?.ambulance_id) {
        setDispatchInfo(null);
        setAmbulanceLocation(null);
        setLastAmbulanceUpdate(null);
        setDistanceKm(null);
        setEtaMinutes(null);
        return;
      }
      setDispatchInfo(dispatch);
      setAmbulanceLocation(null);
      setLastAmbulanceUpdate(dispatch.ambulance_last_location_update || null);
      setEtaMinutes(null);
      setRoutePath(null);
      try {
        const loc = await getAmbulanceLocation(emergencyId);
        if (loc?.latitude != null && loc?.longitude != null) {
          const next = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
          setAmbulanceLocation(next);
          setLastAmbulanceUpdate(loc.created_at || loc.last_location_update || null);
        }
      } catch (trackingErr) {
        if (trackingErr.response?.status !== 404) {
          console.error('Failed to fetch ambulance tracking', trackingErr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dispatch info', err);
    }
  }, [emergencyId]);

  useEffect(() => {
    async function loadDispatch() {
      await fetchCall();
      await fetchDispatchInfo();
    }

    loadDispatch();
  }, [fetchCall, fetchDispatchInfo]);

  // Continuously stream this device's live location while the call is active —
  // this is what lets dispatcher + driver see the caller moving in real time.
  useEffect(() => {
    if (!call || !navigator.geolocation) return;
    const isActive = !['completed', 'cancelled'].includes(call.status);
    if (!isActive) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nextCallerLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCallerLocation(nextCallerLocation);
        sendLocationPing(call.call_id, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [call]);

  const currentStageIndex = call ? STAGES.findIndex((s) => s.key === call.status) : 0;
  const isTrackingLive = call && !['completed', 'cancelled'].includes(call.status);
  const callStatus = call?.status;
  const driverCurrentLocation = useMemo(() => {
    return dispatchInfo?.ambulance_current_latitude != null && dispatchInfo?.ambulance_current_longitude != null
      ? { lat: Number(dispatchInfo.ambulance_current_latitude), lng: Number(dispatchInfo.ambulance_current_longitude) }
      : null;
  }, [dispatchInfo]);
  const effectiveCallerLocation = useMemo(() => {
    if (callerLocation) return callerLocation;
    if (call?.latitude != null && call?.longitude != null) {
      return { lat: Number(call.latitude), lng: Number(call.longitude) };
    }
    return null;
  }, [callerLocation, call]);
  const driverLocation = useMemo(() => {
    if (ambulanceLocation?.lat != null && ambulanceLocation?.lng != null) {
      return ambulanceLocation;
    }

    if (callStatus && ['en_route', 'on_scene', 'transporting'].includes(callStatus)) {
      return driverCurrentLocation;
    }

    return null;
  }, [ambulanceLocation, callStatus, driverCurrentLocation]);
  const mapCenter = useMemo(() => {
    if (effectiveCallerLocation) {
      if (driverLocation) {
        return {
          lat: (effectiveCallerLocation.lat + driverLocation.lat) / 2,
          lng: (effectiveCallerLocation.lng + driverLocation.lng) / 2
        };
      }
      return effectiveCallerLocation;
    }

    if (driverLocation) {
      return driverLocation;
    }

    return { lat: 11.5564, lng: 104.9282 };
  }, [driverLocation, effectiveCallerLocation]);

  
  function handleCopyId() {
    navigator.clipboard.writeText(call.emergency_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function handleCancel() {
    setIsCancelling(true);
    try {
      await cancelEmergencyCall(call.call_id);
      navigate('/');
    } catch (err) {
      console.error('Cancel failed', err);
      setIsCancelling(false);
    }
  }

  useEffect(() => {
    if (!driverLocation || !effectiveCallerLocation || !isLoaded || !window.google?.maps?.DirectionsService) {
      return;
    }

    let active = true;

    const buildRoute = () => {
      const origin = driverLocation;
      const destination = effectiveCallerLocation;
      
      try {
        const directionsService = new window.google.maps.DirectionsService();
        const request = {
          origin,
          destination,
          travelMode: 'DRIVING'
        };
        
        directionsService.route(request, (result, status) => {
          if (status === 'OK' && active) {
            const route = result.routes[0];
            
            // Get polyline points from the route
            const points = [];
            if (route.overview_path) {
              route.overview_path.forEach((point) => {
                points.push({ lat: point.lat(), lng: point.lng() });
              });
            }
            
            if (points.length > 0) {
              setRoutePath(points);
            }
            
            const legs = route.legs[0];
            if (legs?.duration) {
              setEtaMinutes(Math.ceil(legs.duration.value / 60));
            }
            if (legs?.distance?.value != null) {
              const routeKm = Math.round((legs.distance.value / 1000) * 10) / 10;
              setDistanceKm(routeKm.toFixed(1));
            } else {
              const straightLineKm = calculateDistanceKm(origin, destination);
              setDistanceKm(straightLineKm.toFixed(1));
            }
          } else if (status !== 'OK' && active) {
            console.warn('Directions request failed:', status);
            setRoutePath(null);
            setEtaMinutes(null);
            setDistanceKm(calculateDistanceKm(origin, destination).toFixed(1));
          }
        });
      } catch (err) {
        console.warn('Failed to get route:', err);
        if (active) {
          setRoutePath(null);
        }
      }
    };

    buildRoute();
    return () => { active = false; };
  }, [driverLocation, effectiveCallerLocation, isLoaded]);

  useEffect(() => {
    if (!call?.call_id) return;

    const socketBaseUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api')
      .replace(/\/api$/, '')
      .replace(/\/$/, '');

    const socket = io(socketBaseUrl || window.location.origin, {
      transports: ['websocket']
    });

    socketRef.current = socket;
    socket.emit('join_room', `caller_${call.call_id}`);

    socket.on('ambulance_location_update', (update) => {
      if (!update || update.call_id !== call.call_id) return;
      const next = { lat: Number(update.latitude), lng: Number(update.longitude) };
      setAmbulanceLocation(next);
      setLastAmbulanceUpdate(update.timestamp || null);
    });

    const handleStatusUpdate = async (payload) => {
      if (!payload || payload.call_id !== call.call_id) return;
      setCall((prev) => prev ? { ...prev, status: payload.status } : prev);
      if (payload.status === 'assigned' || payload.status === 'en_route') {
        await fetchDispatchInfo();
      }
    };

    socket.on('call_status_update', handleStatusUpdate);

    return () => {
      socket.off('ambulance_location_update');
      socket.off('call_status_update', handleStatusUpdate);
      socket.disconnect();
    };
  }, [call, fetchDispatchInfo]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-ink-soft)' }}>
        Loading your call status…
      </div>
    );
  }

  if (!call) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-emergency-dark)', fontWeight: 600 }}>Couldn't find this emergency call.</p>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </div>
    );
  }

  const isCancelled = call.status === 'cancelled';
  const isComplete = call.status === 'completed';

  return (
    <div style={{ minHeight: '100%', paddingBottom: '90px' }}>
      <header style={{
        padding: 'var(--space-5)',
        background: 'var(--color-emergency)',
        color: '#fff'
      }}>
        <button
          onClick={handleCopyId}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: 'var(--text-sm)', opacity: 0.9, fontWeight: 700, color: '#fff',
            background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 'var(--radius-full)'
          }}
        >
          {copied ? 'Copied!' : call.emergency_id} <Copy size={13} />
        </button>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginTop: 'var(--space-2)' }}>
          {isCancelled ? 'Call cancelled' : isComplete ? 'Help has arrived' : 'Help is on the way'}
        </h1>
        {isTrackingLive && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', opacity: 0.9, marginTop: 'var(--space-2)' }}>
            <Radio size={13} /> Your live location is being shared with dispatch
          </p>
        )}
      </header>

      {!isCancelled && (
        <div style={{ padding: 'var(--space-5)' }}>
          {dispatchInfo && ['assigned', 'en_route', 'on_scene', 'transporting'].includes(call.status) && (
            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-emergency-dark)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>AMBULANCE STATUS</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                Ambulance {dispatchInfo.ambulance_id ? `#${dispatchInfo.ambulance_id}` : ''} has been assigned.
              </p>
              {driverLocation ? (
                <>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: 'var(--space-2)' }}>Ambulance is currently {distanceKm ? `${distanceKm} km away` : 'moving toward you'}</p>
                  {etaMinutes != null && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', marginTop: '4px' }}>Estimated arrival: {etaMinutes} min</p>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', marginTop: 'var(--space-2)' }}>
                  Live ambulance tracking will appear once the driver marks the case as "On the way".
                </p>
              )}
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', marginTop: '4px' }}>Last update: {ambulanceLocation ? (formatCambodiaDateTime(lastAmbulanceUpdate) || 'just now') : 'waiting for driver'}</p>
              {!GOOGLE_MAPS_API_KEY ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', marginTop: 'var(--space-2)' }}>Live map is unavailable right now, but the ambulance status is still updating.</p>
              ) : loadError ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', marginTop: 'var(--space-2)' }}>Live map could not be loaded right now.</p>
              ) : (
                <div style={{ marginTop: 'var(--space-3)', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '220px' }}>
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={MAP_CONTAINER_STYLE}
                      center={mapCenter}
                      zoom={12}
                      options={MAP_OPTIONS}
                    >
                      {effectiveCallerLocation && (
                        <MapMarker
                          position={effectiveCallerLocation}
                          title="Caller location"
                          zIndex={3}
                          kind="caller"
                        />
                      )}
                      {driverLocation && (
                        <>
                          <MapMarker
                            position={driverLocation}
                            title="Driver location"
                            zIndex={4}
                            kind="driver"
                          />
                          {routePath && (
                            <Polyline
                              path={routePath}
                              options={{
                                strokeColor: '#2563eb',
                                strokeOpacity: 0.7,
                                strokeWeight: 4
                              }}
                            />
                          )}
                        </>
                      )}
                    </GoogleMap>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-muted)' }}>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)' }}>Loading live map…</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {STAGES.map((stage, idx) => {
            const isDone = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stage.key} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {isDone
                    ? <CheckCircle2 size={24} color="var(--color-success)" fill="none" />
                    : <Circle size={24} color="var(--color-line)" />}
                  {idx < STAGES.length - 1 && (
                    <div style={{
                      width: '2px',
                      height: '36px',
                      background: idx < currentStageIndex ? 'var(--color-success)' : 'var(--color-line)'
                    }} />
                  )}
                </div>
                <div style={{ paddingBottom: 'var(--space-4)' }}>
                  <p style={{
                    fontWeight: isCurrent ? 700 : 600,
                    color: isDone ? 'var(--color-ink)' : 'var(--color-ink-soft)',
                    fontSize: 'var(--text-base)'
                  }}>
                    {stage.label}
                  </p>
                  {isCurrent && !isComplete && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-emergency-dark)', fontWeight: 600, marginTop: '2px' }}>
                      In progress…
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: '0 var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {!isComplete && !isCancelled && (
          <Button variant="ghost" onClick={handleCancel} disabled={isCancelling} icon={<X size={16} />}>
            {isCancelling ? 'Cancelling…' : 'Cancel this call'}
          </Button>
        )}

        {(isComplete || isCancelled) && (
          <Button onClick={() => navigate('/')}>Back to home</Button>
        )}
      </div>
    </div>
  );
}
