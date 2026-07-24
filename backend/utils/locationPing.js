function normalizeCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeAccuracyMeters(value) {
  if (value === undefined || value === null || value === '') return null;

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;

  return Math.min(number, 9999.99);
}

module.exports = { normalizeCoordinate, normalizeAccuracyMeters };
