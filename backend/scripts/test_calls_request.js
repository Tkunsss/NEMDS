require('dotenv').config();
const { signToken } = require('../utils/jwt');

(async () => {
  try {
    const token = signToken({ user_id: 1, role: 'admin', full_name: 'Test Admin' });
    const res = await fetch('http://localhost:5000/api/calls?status=active', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('HTTP', res.status);
    const body = await res.text();
    console.log(body);
  } catch (err) {
    console.error('request error:', err);
    process.exit(1);
  }
})();
