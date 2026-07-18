function countAvailableAmbulances(ambulances = []) {
  return ambulances.filter((ambulance) => ambulance.status === 'available' && ambulance.deleted_at == null).length;
}

module.exports = { countAvailableAmbulances };
