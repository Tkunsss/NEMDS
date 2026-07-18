function countAvailableAmbulances(ambulances = []) {
  return ambulances.filter((ambulance) => {
    const hasDriver = ambulance.has_driver === true || ambulance.has_driver === 1 || ambulance.has_driver === '1';
    return ambulance.status === 'available' && ambulance.deleted_at == null && hasDriver;
  }).length;
}

module.exports = { countAvailableAmbulances };
