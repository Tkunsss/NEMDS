// src/api/places.js
import apiClient from './client';

const FALLBACK_HOSPITALS = [
  {
    place_id: 'fallback-1',
    name: 'Cambodia-China Friendship Preah Kossamak Hospital',
    address: 'No. 7, Street 102, Phnom Penh, Cambodia',
    phone_number: null,
    latitude: 11.5584,
    longitude: 104.9160
  },
  {
    place_id: 'fallback-2',
    name: 'Calmette Hospital',
    address: 'No. 1, Street 92, Phnom Penh, Cambodia',
    phone_number: null,
    latitude: 11.5628,
    longitude: 104.9175
  },
  {
    place_id: 'fallback-3',
    name: 'Royal Phnom Penh Hospital',
    address: 'No. 161, Preah Norodom Blvd, Phnom Penh, Cambodia',
    phone_number: null,
    latitude: 11.5605,
    longitude: 104.9251
  }
];

function normalizeGooglePlace(place) {
  const location = place.geometry?.location;
  if (!location) return null;

  return {
    place_id: place.place_id,
    name: place.name || 'Unnamed location',
    address: place.formatted_address || place.vicinity || '',
    phone_number: place.international_phone_number || null,
    latitude: location.lat(),
    longitude: location.lng()
  };
}

function filterFallbackHospitals(query) {
  const normalizedQuery = (query || '').toLowerCase();
  const matches = FALLBACK_HOSPITALS.filter((hospital) => {
    const haystack = `${hospital.name} ${hospital.address}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return matches.length > 0 ? matches : FALLBACK_HOSPITALS;
}

export async function searchHospitalsWithBrowserPlaces(query, biasLat, biasLng) {
  if (!window.google?.maps?.places?.PlacesService) return [];

  const container = document.createElement('div');
  const service = new window.google.maps.places.PlacesService(container);
  const request = {
    query,
    type: 'hospital'
  };

  if (biasLat && biasLng) {
    request.location = new window.google.maps.LatLng(Number(biasLat), Number(biasLng));
    request.radius = 20000;
  }

  return new Promise((resolve, reject) => {
    service.textSearch(request, (places, status) => {
      const placesStatus = window.google.maps.places.PlacesServiceStatus;
      if (status === placesStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }

      if (status !== placesStatus.OK) {
        reject(new Error(`Places search failed: ${status}`));
        return;
      }

      resolve((places || []).map(normalizeGooglePlace).filter(Boolean));
    });
  });
}

// Try the backend proxy first, but fall back to a small built-in list so the
// admin UI remains usable in Vercel even when the backend places endpoint is unavailable.
export async function searchHospitalsByText(query, biasLat, biasLng) {
  const params = { query };
  if (biasLat && biasLng) {
    params.lat = biasLat;
    params.lng = biasLng;
  }

  try {
    const { data } = await apiClient.get('/places/search-hospitals', { params });
    return data?.data || [];
  } catch {
    return filterFallbackHospitals(query);
  }
}
