const test = require('node:test');
const assert = require('node:assert/strict');
const { sortByDistance, findNearest } = require('../utils/distance');

test('uses custom latitude and longitude accessors when sorting distances', () => {
  const items = [
    {
      id: 1,
      current_latitude: 10,
      current_longitude: 10
    },
    {
      id: 2,
      home_hospital_latitude: 0.01,
      home_hospital_longitude: 0.01
    }
  ];

  const sorted = sortByDistance(items, 0, 0, {
    getLat: (item) => item.home_hospital_latitude ?? item.current_latitude,
    getLng: (item) => item.home_hospital_longitude ?? item.current_longitude
  });

  assert.equal(sorted[0].id, 2);
  assert.ok(sorted[0].distance_km < sorted[1].distance_km);
});

test('falls back to the first available hospital when none have coordinates', () => {
  const hospitals = [
    { hospital_id: 1, name: 'Fallback Hospital', latitude: null, longitude: null },
    { hospital_id: 2, name: 'Another Hospital', latitude: null, longitude: null }
  ];

  const nearest = findNearest(hospitals, 11.55, 104.91);

  assert.ok(nearest);
  assert.equal(nearest.hospital_id, 1);
});
