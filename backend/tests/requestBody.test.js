const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createJsonBodyParser, handlePayloadTooLarge } = require('../middleware/requestBody');

test('returns 413 when the JSON body exceeds the configured limit', async () => {
  const app = express();
  app.use(createJsonBodyParser());
  app.post('/calls', (req, res) => {
    res.json({ ok: true });
  });
  app.use(handlePayloadTooLarge);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const port = server.address().port;
    const body = JSON.stringify({ photo_data: 'a'.repeat(11 * 1024 * 1024) });

    const response = await fetch(`http://127.0.0.1:${port}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    assert.equal(response.status, 413);
    const payload = await response.json();
    assert.equal(payload.message, 'Request body is too large');
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
