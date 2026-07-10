// src/utils/googleMapsConfig.js
// Single shared loader config — @react-google-maps/api's useJsApiLoader
// should be called with the exact same `id` + `libraries` everywhere it's
// used in the app, or it will try to load the script twice and throw.

export const GOOGLE_MAPS_LOADER_ID = 'ncemds-admin-google-maps-script';
export const GOOGLE_MAPS_LIBRARIES = ['places'];
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
