import { useEffect, useRef } from 'react';

export default function AdvancedMarker({ map, position, icon, title, zIndex, onClick, visible = true, ...options }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google?.maps || !position) return;

    const AdvancedMarkerClass = window.google.maps.marker?.AdvancedMarkerElement;
    const MarkerClass = window.google.maps.Marker;
    const MarkerConstructor = AdvancedMarkerClass || MarkerClass;

    const markerOptions = {
      map,
      position,
      title,
      zIndex,
      icon,
      visible,
      ...options,
    };

    const marker = new MarkerConstructor(markerOptions);
    markerRef.current = marker;

    if (onClick) {
      marker.addListener('click', onClick);
    }

    return () => {
      if (!markerRef.current) return;
      if (markerRef.current instanceof window.google.maps.Marker) {
        markerRef.current.setMap(null);
      } else {
        markerRef.current.map = null;
      }
      markerRef.current = null;
    };
  }, [map, position, icon, title, zIndex, onClick, visible, options]);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setOptions({ position, title, zIndex, icon, visible, ...options });
  }, [position, title, zIndex, icon, visible, options]);

  return null;
}
