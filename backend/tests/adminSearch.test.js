const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../config/db');
const UserModel = require('../models/userModel');

test('searchByTerm queries users by full name or phone number', async () => {
  const originalQuery = pool.query;
  const calls = [];

  pool.query = async (sql, params) => {
    calls.push([sql, params]);
    return [[{ user_id: 42 }]];
  };

  try {
    const results = await UserModel.searchByTerm('ali');

    assert.deepEqual(results, [{ user_id: 42 }]);
    assert.equal(calls.length, 1);
    assert.match(calls[0][0], /LIKE/i);
    assert.deepEqual(calls[0][1], ['%ali%', '%ali%']);
  } finally {
    pool.query = originalQuery;
  }
});
