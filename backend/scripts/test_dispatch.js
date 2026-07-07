require('dotenv').config();
const { signToken } = require('../utils/jwt');

(async () => {
  try {
    const token = signToken({ user_id: 1, role: 'admin', full_name: 'Test Admin' });
    // get available ambulances with driver
    const ambRes = await fetch('http://localhost:5000/api/ambulances?status=available_with_driver', { headers: { Authorization: `Bearer ${token}` } });
    const ambBody = await ambRes.json();
    console.log('ambulances status', ambRes.status);
    console.log(ambBody);

    if (!ambBody?.data?.length) {
      console.log('No available ambulances with driver to test');
      return;
    }
    const ambulance_id = ambBody.data[0].ambulance_id;

    // pick an active call
    const callsRes = await fetch('http://localhost:5000/api/calls?status=active', { headers: { Authorization: `Bearer ${token}` } });
    const callsBody = await callsRes.json();
    console.log('calls status', callsRes.status);
    console.log(callsBody);
    const call = callsBody.data?.[0];
    if (!call) return console.log('No active call to test');

    // attempt dispatch
    const postRes = await fetch('http://localhost:5000/api/dispatches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id: call.call_id, ambulance_id })
    });
    const postBody = await postRes.text();
    console.log('dispatch POST status', postRes.status);
    console.log(postBody);
  } catch (err) {
    console.error('test dispatch error', err);
  }
})();
