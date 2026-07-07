function resolveCallerLocation(call, latestLocation) {
  if (latestLocation && latestLocation.latitude != null && latestLocation.longitude != null) {
    return {
      latitude: Number(latestLocation.latitude),
      longitude: Number(latestLocation.longitude),
      created_at: latestLocation.created_at || call?.created_at
    };
  }

  if (call && call.latitude != null && call.longitude != null) {
    return {
      latitude: Number(call.latitude),
      longitude: Number(call.longitude),
      created_at: call.created_at
    };
  }

  return null;
}

module.exports = { resolveCallerLocation };
