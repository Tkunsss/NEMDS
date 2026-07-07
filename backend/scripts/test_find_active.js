require('dotenv').config();
const CallModel = require('../models/callModel');

(async () => {
  try {
    const rows = await CallModel.findActive(null);
    console.log('findActive result count:', rows.length);
    console.log(rows.slice(0,5));
    process.exit(0);
  } catch (err) {
    console.error('findActive error:', err);
    process.exit(1);
  }
})();
