import { useEffect, useRef } from 'react';
import { Marker, useGoogleMap } from '@react-google-maps/api';

export default function MapMarker({ position, title, zIndex, kind = 'default' }) {
  const map = useGoogleMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position || !window.google?.maps?.marker?.AdvancedMarkerElement) return undefined;

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.width = '24px';
    container.style.height = '24px';
    container.style.borderRadius = '999px';
    container.style.border = '2px solid #fff';
    container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    container.style.background = kind === 'driver' ? '#f97316' : '#2563eb';
    container.style.color = '#fff';
    container.style.fontSize = '12px';
    container.style.fontWeight = '700';
    container.style.lineHeight = '1';
    container.textContent = kind === 'driver' ? '🚑' : '•';

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title,
      zIndex,
      content: container
    });

    markerRef.current = marker;

    return () => {
      markerRef.current = null;
      if (marker.element) {
        marker.element.remove();
      }
    };
  }, [map, position?.lat, position?.lng, title, zIndex, kind]);

  if (!map) return null;

  if (!window.google?.maps?.marker?.AdvancedMarkerElement) {
    return (
      <Marker
        position={position}
        title={title}
        zIndex={zIndex}
      />
    );
  }

  return null;
}
