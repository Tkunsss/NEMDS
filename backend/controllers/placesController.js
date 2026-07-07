// controllers/placesController.js

// One-time admin tool: search Google Places API (New) for real hospitals,
// so an admin can review results and import the ones that matter into our
// own `hospitals` table. After import, the running system never calls this
// again — dispatch logic works purely off our own database from then on.
//
// Uses Places API (New) Text Search: https://places.googleapis.com/v1/places:searchText
// This is intentionally proxied through the backend so GOOGLE_PLACES_API_KEY
// never reaches any frontend bundle.

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// GET /api/places/search-hospitals?query=hospital+phnom+penh&lat=...&lng=...
async function searchHospitals(req, res) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'GOOGLE_PLACES_API_KEY is not configured on the server'
      });
    }

    const { query, lat, lng } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'query is required, e.g. "hospital phnom penh"' });
    }

    const body = {
      textQuery: query,
      includedType: 'hospital',
      maxResultCount: 10
    };

    // Bias results toward a location if the caller supplied one (e.g. the
    // admin's current map center), without restricting results to it —
    // locationBias is a hint, not a hard filter.
    if (lat && lng) {
      body.locationBias = {
        circle: {
          center: { latitude: Number(lat), longitude: Number(lng) },
          radius: 20000 // 20km
        }
      };
    }

    const response = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // FieldMask controls billing — only request the fields we actually use
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.id'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Places API error:', data);
      return res.status(502).json({
        success: false,
        message: data.error?.message || 'Places API request failed'
      });
    }

    const results = (data.places || []).map((place) => ({
      place_id: place.id,
      name: place.displayName?.text || 'Unnamed location',
      address: place.formattedAddress || '',
      phone_number: place.internationalPhoneNumber || null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null
    }));

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('searchHospitals error:', err);
    res.status(500).json({ success: false, message: 'Server error searching hospitals' });
  }
}

module.exports = { searchHospitals };
