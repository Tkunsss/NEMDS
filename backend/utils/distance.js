// utils/distance.js

// Haversine formula — great-circle distance between two lat/lng points in km.
// Good enough for "which hospital is closest" at city scale; doesn't account
// for actual road routing, but needs no external API call.
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Sorts a list of items by distance from a reference point, ascending.
// Adds a `distance_km` field to each. When provided, custom accessors override
// the default latitude/longitude property names.
function sortByDistance(items, refLat, refLng, options = {}) {
  const { latKey = 'latitude', lngKey = 'longitude', getLat, getLng } = options;

  return items
    .filter((item) => {
      const lat = getLat ? getLat(item) : item[latKey];
      const lng = getLng ? getLng(item) : item[lngKey];
      return lat != null && lng != null;
    })
    .map((item) => {
      const lat = getLat ? getLat(item) : item[latKey];
      const lng = getLng ? getLng(item) : item[lngKey];
      return {
        ...item,
        distance_km: Math.round(distanceKm(refLat, refLng, Number(lat), Number(lng)) * 10) / 10
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km);
}

// Just the single closest item, or a fallback hospital when the list has no
// coordinate-bearing entries. Used for auto-routing a new call to a hospital
// even if no coordinate-based match is possible.
function findNearest(items, refLat, refLng, opts = {}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const sorted = sortByDistance(items, refLat, refLng, opts);
  if (sorted.length > 0) return sorted[0];

  return items[0];
}

module.exports = { distanceKm, sortByDistance, findNearest };
