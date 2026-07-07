import { useEffect, useMemo, useRef } from 'react';

function createContentForAdvancedMarker(icon) {
  if (!icon) return null;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.transform = 'translate(-50%, -100%)';

  if (typeof icon === 'string') {
    const img = document.createElement('img');
    img.src = icon;
    img.style.display = 'block';
    wrapper.appendChild(img);
    return wrapper;
  }

  if (icon.url) {
    const img = document.createElement('img');
    img.src = icon.url;
    img.style.display = 'block';
    img.style.width = icon.scaledSize?.width ? `${icon.scaledSize.width}px` : '32px';
    img.style.height = icon.scaledSize?.height ? `${icon.scaledSize.height}px` : '32px';
    wrapper.appendChild(img);
    return wrapper;
  }

  if (icon.path === window.google.maps.SymbolPath.CIRCLE) {
    const size = icon.scale ? icon.scale * 2 : 20;
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;
    wrapper.style.backgroundColor = icon.fillColor || '#2563eb';
    wrapper.style.border = `${icon.strokeWeight ?? 2}px solid ${icon.strokeColor || '#ffffff'}`;
    wrapper.style.borderRadius = '50%';
    return wrapper;
  }

  return null;
}

export default function AdvancedMarker({ map, position, icon, title, zIndex, onClick, visible = true }) {
  const markerRef = useRef(null);
  const content = useMemo(() => {
    if (!window.google?.maps) return null;
    return createContentForAdvancedMarker(icon);
  }, [icon]);

  useEffect(() => {
    if (!map || !window.google?.maps || !position) return;

    const AdvancedMarkerClass = window.google.maps.marker?.AdvancedMarkerElement;
    const MarkerClass = window.google.maps.Marker;
    const mapCapabilities = typeof map.getMapCapabilities === 'function'
      ? map.getMapCapabilities()
      : null;
    const advancedAvailable = !!(
      AdvancedMarkerClass &&
      mapCapabilities?.isAdvancedMarkersAvailable === true
    );

    const sharedOptions = {
      position,
      title,
      zIndex,
    };

    let marker = null;
    if (advancedAvailable) {
      try {
        marker = new AdvancedMarkerClass({ map, ...sharedOptions, content });
      } catch (err) {
        marker = null;
      }
    }

    if (!marker) {
      marker = new MarkerClass({ map, ...sharedOptions, icon, visible });
    }

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
  }, [map, position, content, title, zIndex, onClick, visible]);

  useEffect(() => {
    if (!markerRef.current) return;

    const setOptions = {
      position,
      title,
      zIndex,
      visible,
    };

    if (markerRef.current instanceof window.google.maps.Marker) {
      setOptions.icon = icon;
    } else {
      setOptions.content = content;
    }

    markerRef.current.setOptions(setOptions);
  }, [position, icon, content, title, zIndex, visible]);

  return null;
}
