// src/components/CallerLocationMap.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, OverlayView, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../utils/googleMapsConfig';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1B1D21' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1B1D21' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A3A6AC' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#32353B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#121316' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
];

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
  styles: DARK_MAP_STYLE
};

function EmojiMarker({ position, title, text, fontSize = '20px', zIndex }) {
  if (!position) return null;

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -height
      })}
    >
      <div
        title={title}
        aria-label={title}
        role="img"
        style={{ fontSize, lineHeight: 1, userSelect: 'none', pointerEvents: 'none', zIndex }}
      >
        {text}
      </div>
    </OverlayView>
  );
}

function toRoutePoint(point) {
  if (!point) return null;

  const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
  const lng = typeof point.lng === 'function' ? point.lng() : point.lng;

  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? { lat: Number(lat), lng: Number(lng) }
    : null;
}

export default function CallerLocationMap({ callId, height = 220, destinationLat, destinationLng, destinationName = 'Hospital', driverLat, driverLng, driverName = 'Starting Hospital', callerConfirmedLat, callerConfirmedLng }) {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const normalizedCallId = callId != null ? String(callId) : null;
  const [position, setPosition] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const mapRef = useRef(null);
  const lastCallIdRef = useRef(normalizedCallId);
  const hasLivePositionRef = useRef(false);
  const confirmedPosRef = useRef(null);

  // Handle callId changes: update refs and clear state conditionally
  useEffect(() => {
    const callIdChanged = normalizedCallId !== lastCallIdRef.current;
    
    if (callIdChanged) {
      // Only clear state if callId changed (not on initial mount)
      setPosition(null);
      setRoutePath(null);
      lastCallIdRef.current = normalizedCallId;
      hasLivePositionRef.current = false;
      confirmedPosRef.current = null;
    }
  }, [normalizedCallId]);

  // Use caller's confirmed location if provided
  useEffect(() => {
    if (callerConfirmedLat != null && callerConfirmedLng != null) {
      const confirmedPos = { lat: Number(callerConfirmedLat), lng: Number(callerConfirmedLng) };
      
      // Only update if position has changed
      if (!confirmedPosRef.current || 
          confirmedPosRef.current.lat !== confirmedPos.lat || 
          confirmedPosRef.current.lng !== confirmedPos.lng) {
        confirmedPosRef.current = confirmedPos;
        setPosition(confirmedPos);
        
        // Pan map on first load
        setTimeout(() => {
          if (mapRef.current && !hasLivePositionRef.current) {
            mapRef.current.panTo(confirmedPos);
            hasLivePositionRef.current = true;
          }
        }, 0);
      }
    }
  }, [callerConfirmedLat, callerConfirmedLng]);

  // Calculate position objects with useMemo to prevent unnecessary re-renders
  const destinationPos = useMemo(() => 
    destinationLat != null && destinationLng != null ? { lat: Number(destinationLat), lng: Number(destinationLng) } : null,
    [destinationLat, destinationLng]
  );

  const driverPos = useMemo(() => 
    driverLat != null && driverLng != null ? { lat: Number(driverLat), lng: Number(driverLng) } : null,
    [driverLat, driverLng]
  );

  // Track live driver position via browser Geolocation if available (use as priority over prop)
  const [liveDriverPos, setLiveDriverPos] = useState(null);
  useEffect(() => {
    if (!navigator?.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (id != null) navigator.geolocation.clearWatch(id);
    };
  }, []);

  // Use live GPS when available, otherwise fall back to server-provided driver position
  const effectiveDriverPos = liveDriverPos || driverPos;

  // Calculate route from driver to caller
  useEffect(() => {
    if (!isLoaded || !position || !effectiveDriverPos) return;

    let active = true;

    async function buildRoute() {
      try {
        if (!window.google?.maps?.importLibrary) {
          throw new Error('Google Maps importLibrary is unavailable');
        }

        const { Route } = await window.google.maps.importLibrary('routes');
        if (!Route?.computeRoutes) {
          throw new Error('Route.computeRoutes is unavailable');
        }

        const { routes } = await Route.computeRoutes({
          origin: effectiveDriverPos,
          destination: position,
          travelMode: 'DRIVING',
          fields: ['path']
        });

        if (!active) return;

        const points = routes?.[0]?.path?.map(toRoutePoint).filter(Boolean) || [];
        setRoutePath(points.length > 0 ? points : null);
      } catch (err) {
        console.warn('Failed to get route:', err);
        if (active) {
          setRoutePath(null);
        }
      }
    }

    buildRoute();
    return () => {
      active = false;
    };
  }, [position, effectiveDriverPos, isLoaded]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-panel)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>
        Map not configured
      </div>
    );
  }

  if (!isLoaded || !position) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-panel)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-faint)', fontSize: 'var(--text-sm)' }}>
        {!isLoaded ? 'Loading map…' : 'No location yet'}
      </div>
    );
  }

  // Calculate center point between all relevant locations
  let centerPos = position;
  if (effectiveDriverPos && destinationPos) {
    // All three points: average them
    centerPos = {
      lat: (position.lat + effectiveDriverPos.lat + destinationPos.lat) / 3,
      lng: (position.lng + effectiveDriverPos.lng + destinationPos.lng) / 3
    };
  } else if (destinationPos) {
    // Caller and destination
    centerPos = { lat: (position.lat + destinationPos.lat) / 2, lng: (position.lng + destinationPos.lng) / 2 };
  } else if (effectiveDriverPos) {
    // Caller and driver
    centerPos = { lat: (position.lat + effectiveDriverPos.lat) / 2, lng: (position.lng + effectiveDriverPos.lng) / 2 };
  }
  
  const zoom = (effectiveDriverPos && destinationPos) ? 13 : (destinationPos || effectiveDriverPos ? 14 : 15);

  return (
    <div style={{ height, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={centerPos}
        zoom={zoom}
        options={MAP_OPTIONS}
        onLoad={(map) => {
          mapRef.current = map;
          if (position && !hasLivePositionRef.current) {
            map.panTo(position);
            hasLivePositionRef.current = true;
          }
        }}
      >
        
        {/* Ambulance starting hospital / live driver marker */}
        {effectiveDriverPos && (
          <EmojiMarker
            position={effectiveDriverPos}
            title={driverName}
            text="🚑"
            fontSize="28px"
            zIndex={999}
          />
        )}
        
        {/* Caller location marker */}
        <EmojiMarker
          position={position}
          title="Caller Location"
          zIndex={1}
          text="📍"
          fontSize="20px"
        />
        
        {/* Destination hospital marker */}
        {destinationPos && (
          <EmojiMarker
            position={destinationPos}
            title={destinationName}
            text="🏥"
            fontSize="22px"
          />
        )}

        {/* Route from driver to caller (follows roads) */}
        {routePath && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#4A90E2',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              geodesic: true
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
