const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function normalizePhotoData(photoData) {
  if (typeof photoData !== 'string') return null;

  const trimmed = photoData.trim();
  if (!trimmed) return null;

  const dataUrlPrefix = 'data:';
  const hasDataUrl = trimmed.startsWith(dataUrlPrefix);
  const sizeEstimate = trimmed.length;

  if (sizeEstimate > MAX_PHOTO_BYTES * 1.4) {
    return null;
  }

  if (!hasDataUrl) {
    return trimmed;
  }

  return trimmed;
}

module.exports = { normalizePhotoData, MAX_PHOTO_BYTES };
