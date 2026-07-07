// src/pages/ConfirmLocationScreen.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Crosshair, ArrowLeft, AlertTriangle } from 'lucide-react';
import { submitEmergencyCall } from '../api/calls';
import { addEmergencyId } from '../utils/localHistory';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../utils/googleMapsConfig';
import Button from '../components/Button';

const FALLBACK_CENTER = { lat: 11.5564, lng: 104.9282 }; // Phnom Penh — used only if GPS is unavailable

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

// Strips Google's default POI/transit clutter so the pin and the caller's
// immediate surroundings stay the visual focus — closer to the stripped-down
// look of a ride-hailing pickup map than a full city explorer map.
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
  ]
};

export default function ConfirmLocationScreen() {
  const navigate = useNavigate();

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(FALLBACK_CENTER);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const mapRef = useRef(null);

  const locateDevice = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported on this device — you can still drop a pin manually');
      setPosition(FALLBACK_CENTER);
      setIsLocating(false);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        setMapCenter(next);
        setAccuracy(pos.coords.accuracy);
        setIsLocating(false);
        if (mapRef.current) mapRef.current.panTo(next);
      },
      () => {
        setLocationError('Could not detect your location — drag the map to your location manually');
        setPosition(FALLBACK_CENTER);
        setMapCenter(FALLBACK_CENTER);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => { locateDevice(); }, [locateDevice]);

  function handleMapClick(e) {
    const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setPosition(next);
    setMapCenter(next);
    if (mapRef.current) mapRef.current.panTo(next);
  }

  function handleMapDragStart() {
    setIsMapDragging(true);
  }

  function handleMapDragEnd() {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const next = { lat: center.lat(), lng: center.lng() };
    setPosition(next);
    setMapCenter(next);
    setIsMapDragging(false);
  }

  async function handleConfirm() {
    if (!position) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const call = await submitEmergencyCall({
        emergency_type: 'medical',
        severity: 'unknown',
        description: description.trim() || undefined,
        latitude: position.lat,
        longitude: position.lng,
        address_text: addressText.trim() || undefined
      });
      addEmergencyId(call.emergency_id);
      navigate(`/tracking/${call.emergency_id}`, { replace: true });
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not send your request. Try again.');
      setIsSubmitting(false);
    }
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <FullScreenNotice
        icon={<AlertTriangle size={32} color="var(--color-emergency)" />}
        title="Map not configured"
        message="VITE_GOOGLE_MAPS_API_KEY is missing. Add it to this app's .env file to enable location confirmation."
        onBack={() => navigate(-1)}
      />
    );
  }

  if (loadError) {
    return (
      <FullScreenNotice
        icon={<AlertTriangle size={32} color="var(--color-emergency)" />}
        title="Couldn't load the map"
        message="Check your internet connection and that the API key has the Maps JavaScript API enabled."
        onBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)', background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-line)', zIndex: 20
      }}>
        <button onClick={() => navigate(-1)} aria-label="Back" style={{ padding: 'var(--space-2)' }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Confirm your location</h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)' }}>Drag the map until the pin is on the right place</p>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        {isLoaded && position && (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={16}
            options={MAP_OPTIONS}
            onClick={handleMapClick}
            onLoad={(map) => { mapRef.current = map; }}
            onDragStart={handleMapDragStart}
            onDragEnd={handleMapDragEnd}
          >
            <Marker position={position} />
          </GoogleMap>
        )}

        {(!isLoaded || isLocating) && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(250,248,246,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}>
            <p style={{ color: 'var(--color-ink-soft)', fontWeight: 600 }}>
              {!isLoaded ? 'Loading map…' : 'Finding your location…'}
            </p>
          </div>
        )}

        <button
          onClick={locateDevice}
          aria-label="Use my current location"
          style={{
            position: 'absolute', bottom: 'var(--space-4)', right: 'var(--space-4)', zIndex: 15,
            width: '52px', height: '52px', borderRadius: '50%', background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Crosshair size={22} color="var(--color-emergency)" />
        </button>

      </div>

      <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderTop: '1px solid var(--color-line)' }}>
        {locationError && (
          <p style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            {locationError}
          </p>
        )}

        <input
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
          placeholder="Landmark or address (optional)"
          style={{
            width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--color-line)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)'
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything dispatch should know? (optional)"
          rows={2}
          style={{
            width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--color-line)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', resize: 'none'
          }}
        />

        {submitError && (
          <p style={{ color: 'var(--color-emergency-dark)', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
            {submitError}
          </p>
        )}

        <Button fullWidth size="lg" onClick={handleConfirm} disabled={!position || isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Confirm location & send'}
        </Button>
      </div>
    </div>
  );
}

function FullScreenNotice({ icon, title, message, onBack }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', textAlign: 'center' }}>
      {icon}
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 'var(--space-4) 0 var(--space-2)' }}>{title}</h1>
      <p style={{ color: 'var(--color-ink-soft)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)', maxWidth: '320px' }}>{message}</p>
      <Button onClick={onBack}>Go back</Button>
    </div>
  );
}
