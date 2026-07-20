// src/components/CallerLocationMap.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../utils/googleMapsConfig';
import { getAmbulanceLocation } from '../api/ambulances';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1B1D21' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1B1D21' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8B969C' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2A3338' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F1417' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
];

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
  styles: DARK_MAP_STYLE
};

export default function CallerLocationMap({ fallbackLat, fallbackLng, height = 200, ambulanceId }) {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const mapRef = useRef(null);
  const [driverPosition, setDriverPosition] = useState(null);

  const callerPosition = useMemo(
    () =>
      fallbackLat != null && fallbackLng != null
        ? { lat: Number(fallbackLat), lng: Number(fallbackLng) }
        : null,
    [fallbackLat, fallbackLng]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDriverPosition() {
      if (!ambulanceId) {
        setDriverPosition(null);
        return;
      }

      try {
        const location = await getAmbulanceLocation(ambulanceId);
        if (!cancelled && location?.latitude != null && location?.longitude != null) {
          setDriverPosition({ lat: Number(location.latitude), lng: Number(location.longitude) });
        }
      } catch {
        if (!cancelled) {
          setDriverPosition(null);
        }
      }
    }

    loadDriverPosition();
    const interval = window.setInterval(loadDriverPosition, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [ambulanceId]);

  const mapCenter = useMemo(() => {
    if (callerPosition && driverPosition) {
      return {
        lat: (callerPosition.lat + driverPosition.lat) / 2,
        lng: (callerPosition.lng + driverPosition.lng) / 2
      };
    }

    return callerPosition || driverPosition || { lat: 11.5564, lng: 104.9282 };
  }, [callerPosition, driverPosition]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>
        Map not configured
      </div>
    );
  }

  if (!isLoaded || !callerPosition) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-panel-raised)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>
        {!isLoaded ? 'Loading map…' : 'No location yet'}
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={mapCenter}
        zoom={14}
        options={MAP_OPTIONS}
        onLoad={(map) => {
          mapRef.current = map;
          if (mapCenter) {
            map.panTo(mapCenter);
          }
        }}
      >
        <Marker
          position={callerPosition}
          title="Caller location"
          label={{ text: '📍', fontSize: '20px' }}
          icon={{
            url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
          }}
        />
        {driverPosition && (
          <Marker
            position={driverPosition}
            title="Ambulance location"
            label={{ text: '🚑', fontSize: '20px' }}
            icon={{
              url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
