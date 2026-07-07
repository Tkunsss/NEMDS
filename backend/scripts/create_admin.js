// scripts/create_admin.js
// Usage (from backend/):
//   node scripts/create_admin.js --phone=0123456789 --password=Secret123 --name="Admin User"

require('dotenv').config();
const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const m = arg.match(/^--([a-zA-Z0-9_\-]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  });
  return args;
}

async function main() {
  const { phone, password, name, email, role = 'admin', hospital_id } = parseArgs();
  if (!phone || !password || !name) {
    console.error('Missing required args. Example: --phone=0123 --password=secret --name="Admin"');
    process.exit(1);
  }

  try {
    const existing = await UserModel.findByPhone(phone);
    if (existing) {
      console.error('A user with that phone number already exists:', existing.user_id);
      process.exit(1);
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_id = await UserModel.create({ full_name: name, phone_number: phone, email: email || null, password_hash, role, hospital_id: hospital_id || null });
    console.log('Created admin user with user_id =', user_id);
    process.exit(0);
  } catch (err) {
    console.error('Error creating user:', err.message || err);
    process.exit(1);
  }
}

main();
