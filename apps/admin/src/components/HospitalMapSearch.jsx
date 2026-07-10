// src/components/HospitalMapSearch.jsx
import { useState, useRef, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Search, AlertTriangle, MapPin, Loader } from 'lucide-react';
import { searchHospitalsByText } from '../api/places';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '../utils/googleMapsConfig';

const MAP_CONTAINER_STYLE = { width: '100%', height: '400px' };

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
  ]
};

const DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 }; // Phnom Penh

export default function HospitalMapSearch({ onSearch, onLocationSelect, existingHospitals = [] }) {
  // If API key is missing, skip loading and show error directly
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{
        padding: 'var(--space-5)', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start'
      }}>
        <AlertTriangle size={20} color="var(--color-danger)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Google Maps API key is not configured</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', lineHeight: '1.4', marginBottom: 'var(--space-2)' }}>
            To use map-based search, add <code style={{ background: 'var(--color-bg)', padding: '2px 4px', borderRadius: '3px' }}>VITE_GOOGLE_MAPS_API_KEY</code> to your <code style={{ background: 'var(--color-bg)', padding: '2px 4px', borderRadius: '3px' }}>.env</code> file.
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
            💡 You can still use the text search below to find hospitals by name
          </p>
        </div>
      </div>
    );
  }

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const mapRef = useRef(null);

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const location = { lat, lng };

    setSelectedLocation(location);
    setMapCenter(location);

    // Trigger location-based hospital search
    handleLocationSearch(lat, lng);
  }, []);

  const handleLocationSearch = useCallback(async (lat, lng) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      // Search for hospitals near the clicked location
      const results = await searchHospitalsByText('hospital', lat, lng);
      // Filter out hospitals already in database
      const filtered = results.filter((searchResult) => {
        return !existingHospitals.some((dbHospital) => {
          const nameMatch = searchResult.name.toLowerCase().trim() === dbHospital.name.toLowerCase().trim();
          const coordMatch = searchResult.latitude && searchResult.longitude &&
            Math.abs(searchResult.latitude - dbHospital.latitude) < 0.001 &&
            Math.abs(searchResult.longitude - dbHospital.longitude) < 0.001;
          return nameMatch || (coordMatch && dbHospital.latitude && dbHospital.longitude);
        });
      });
      onSearch(filtered, { lat, lng });
    } catch (err) {
      const status = err.response?.status;
      let message = 'Could not search hospitals at this location';
      
      if (status === 503) {
        message = '❌ Backend API: GOOGLE_PLACES_API_KEY not configured on server';
      } else if (status === 502) {
        message = '❌ Places API request failed. Check backend configuration.';
      } else if (status === 401 || status === 403) {
        message = '❌ You must be logged in as an admin.';
      } else {
        message = err.response?.data?.message || 'Could not search hospitals — backend may be offline.';
      }
      
      setSearchError(message);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, existingHospitals]);

  const handleRecenterClick = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.panTo(DEFAULT_CENTER);
      setMapCenter(DEFAULT_CENTER);
    }
  }, []);

  if (loadError) {
    return (
      <div style={{
        padding: 'var(--space-5)', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start'
      }}>
        <AlertTriangle size={20} color="var(--color-danger)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Maps API Error: ApiTargetBlockedMapError</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', lineHeight: '1.5', marginBottom: 'var(--space-2)' }}>
            <strong>The Google Maps API key is invalid, expired, or doesn't have the necessary permissions.</strong>
            <br /><br />
            <strong>Quick fix checklist:</strong>
            <br />✓ Go to Google Cloud Console → APIs & Services → Enabled APIs
            <br />✓ Enable "Maps JavaScript API"
            <br />✓ Go to Credentials → Edit your API key
            <br />✓ Under "Application restrictions", add: <code style={{ background: 'var(--color-bg)', padding: '1px 3px' }}>localhost:*</code>
            <br />✓ Restart dev server: <code style={{ background: 'var(--color-bg)', padding: '1px 3px' }}>npm run dev</code>
            <br /><br />
            📖 See <code style={{ background: 'var(--color-bg)', padding: '1px 3px' }}>GOOGLE_MAPS_SETUP.md</code> for detailed instructions
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
            💡 Use the text search below to find hospitals by name
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        padding: 'var(--space-5)', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center'
      }}>
        <Loader size={20} />
        <p style={{ fontSize: 'var(--text-sm)' }}>Loading map...</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: 'var(--space-5)', background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-5)'
    }}>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
          Search hospitals on the map
        </h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)' }}>
          Click on the map to search for hospitals near that location
        </p>
      </div>

      {isLoaded && !loadError && (
        <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
          <GoogleMap
            ref={mapRef}
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={12}
            onClick={handleMapClick}
            options={MAP_OPTIONS}
            onLoad={(map) => {
              mapRef.current = map;
            }}
          >
            {selectedLocation && (
              <Marker
                position={selectedLocation}
                title="Search location"
                icon={{
                  path: window.google?.maps?.SymbolPath?.CIRCLE,
                  scale: 8,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.8,
                  strokeColor: '#fff',
                  strokeWeight: 2
                }}
              />
            )}
          </GoogleMap>

          <button
            onClick={handleRecenterClick}
            style={{
              position: 'absolute', bottom: 'var(--space-2)', right: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)', background: '#fff',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer',
              zIndex: 10
            }}
          >
            Recenter
          </button>
        </div>
      )}

      {selectedLocation && (
        <div style={{
          padding: 'var(--space-3)', background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-3)',
          fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)'
        }}>
          Searching near: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          {isSearching && <Loader size={12} style={{ display: 'inline', marginLeft: '8px', animation: 'spin 1s linear infinite' }} />}
        </div>
      )}

      {searchError && (
        <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{searchError}</p>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
