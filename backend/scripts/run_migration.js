// scripts/run_migration.js
// Executes a SQL migration file against the configured DB (backend/.env)
// Usage: node scripts/run_migration.js migrations/002_hospital_scoping.sql

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
  if (!fs.existsSync(abs)) {
    console.error('Migration file not found:', abs);
    process.exit(1);
  }

  const raw = fs.readFileSync(abs, 'utf8');
  // Remove SQL comments and USE statements which may reference a different DB name
  const cleaned = raw
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .filter((l) => !/^\s*USE\s+/i.test(l))
    .join('\n');

  // Split statements by semicolon. This is simple but adequate for these migrations.
  const statements = cleaned.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

  console.log('Running', statements.length, 'statements from', abs);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      console.log('OK:', stmt.split('\n')[0].slice(0, 120));
    } catch (err) {
      console.error('FAILED:', err.sqlMessage || err.message || err);
      console.error('Statement:', stmt.substring(0, 300));
      // Continue on errors that indicate the column/index already exists
      const msg = (err.sqlMessage || '').toLowerCase();
      if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('duplicate key')) {
        console.log('Skipping existing object error');
        continue;
      }
      await pool.end();
      process.exit(1);
    }
  }

  await pool.end();
  console.log('Migration complete');
}

const fileArg = process.argv[2] || 'migrations/002_hospital_scoping.sql';
runFile(fileArg).catch((err) => { console.error('Migration runner error:', err); process.exit(1); });
