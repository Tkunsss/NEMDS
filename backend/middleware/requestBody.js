const express = require('express');

const createJsonBodyParser = (limitInMB = 4) => express.json({
  limit: `${limitInMB}mb`
});

function handlePayloadTooLarge(err, req, res, next) {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }
  next(err);
}

module.exports = {
  createJsonBodyParser,
  handlePayloadTooLarge
};
