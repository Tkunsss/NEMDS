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
    const normalizedQuery = (query || '').toLowerCase();
    return FALLBACK_HOSPITALS.filter((hospital) => {
      const haystack = `${hospital.name} ${hospital.address}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }).length > 0
      ? FALLBACK_HOSPITALS.filter((hospital) => {
          const haystack = `${hospital.name} ${hospital.address}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : FALLBACK_HOSPITALS;
  }
}
