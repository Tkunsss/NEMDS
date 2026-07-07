// controllers/proximityController.js
const HospitalModel = require('../models/hospitalModel');
const AmbulanceModel = require('../models/ambulanceModel');
const { sortByDistance } = require('../utils/distance');

// GET /api/proximity/hospitals?lat=...&lng=...
// Dispatcher: hospitals sorted by distance from a call's location, so the
// dispatcher can quickly pick the closest one as the dispatch destination.
// Pure math against our own `hospitals` table — no external API call.
async function nearestHospitals(req, res) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const hospitals = await HospitalModel.findAll();
    const sorted = sortByDistance(hospitals, Number(lat), Number(lng));

    res.json({ success: true, data: sorted });
  } catch (err) {
    console.error('nearestHospitals error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/proximity/ambulances?lat=...&lng=...
// Dispatcher: crewed + available ambulances sorted by distance from a call's
// location, using each ambulance's last reported GPS position. Falls back to
// "no distance" (sorted last) for any ambulance with no location reported yet.
// Scoped to the dispatcher's own hospital fleet — they should never see or
// borrow another hospital's ambulance, even one that happens to be closer.
async function nearestAmbulances(req, res) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const hospital_id = req.user.role === 'dispatcher' ? req.user.hospital_id : null;
    const ambulances = await AmbulanceModel.findAvailableWithDriver(hospital_id);

    const annotated = ambulances.map((ambulance) => {
      if (ambulance.current_latitude != null && ambulance.current_longitude != null) {
        return {
          ...ambulance,
          location_source: 'gps',
          latitude: Number(ambulance.current_latitude),
          longitude: Number(ambulance.current_longitude)
        };
      }

      if (ambulance.home_hospital_latitude != null && ambulance.home_hospital_longitude != null) {
        return {
          ...ambulance,
          location_source: 'home_hospital',
          latitude: Number(ambulance.home_hospital_latitude),
          longitude: Number(ambulance.home_hospital_longitude)
        };
      }

      return { ...ambulance, location_source: 'unknown' };
    });

    const availableWithLocation = annotated.filter((a) => a.latitude != null && a.longitude != null);
    const withoutLocation = annotated.filter((a) => a.latitude == null || a.longitude == null);

    const sorted = sortByDistance(availableWithLocation, Number(lat), Number(lng), {
      getLat: (ambulance) => ambulance.home_hospital_latitude ?? ambulance.latitude,
      getLng: (ambulance) => ambulance.home_hospital_longitude ?? ambulance.longitude
    });

    res.json({ success: true, data: [...sorted, ...withoutLocation] });
  } catch (err) {
    console.error('nearestAmbulances error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { nearestHospitals, nearestAmbulances };
