// src/components/CallerLocationMap.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
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

export default function CallerLocationMap({ callId, height = 220, destinationLat, destinationLng, destinationName = 'Hospital', driverLat, driverLng, driverName = 'Starting Hospital', callerConfirmedLat, callerConfirmedLng }) {
  const { isLoaded } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const normalizedCallId = callId != null ? String(callId) : null;
  const [position, setPosition] = useState(null);
  const [directions, setDirections] = useState(null);
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
      setDirections(null);
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

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: effectiveDriverPos,
        destination: position,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        }
      }
    );
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
          <Marker
            position={effectiveDriverPos}
            title={driverName}
            label={{ text: '🚑', fontSize: '28px' }}
            zIndex={999}
            icon={{
              url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
            }}
          />
        )}
        
        {/* Caller location marker */}
        <Marker 
          position={position}
          title="Caller Location"
          zIndex={1}
          label={{ text: '📍', fontSize: '20px' }}
          icon={{
            url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
          }}
        />
        
        {/* Destination hospital marker */}
        {destinationPos && (
          <Marker 
            position={destinationPos}
            title={destinationName}
            label={{ text: '🏥', fontSize: '22px' }}
            icon={{
              url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
            }}
          />
        )}

        {/* Directions route from caller to destination (follows roads) */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              polylineOptions: {
                strokeColor: '#4A90E2',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                geodesic: true
              },
              suppressMarkers: true
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
