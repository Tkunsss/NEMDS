// middleware/validators/callValidators.js
const { body, validationResult } = require('express-validator');

// NCEMDS currently handles medical emergencies only. This list intentionally
// has one entry — narrowing it here means every other layer (controller
// default, frontend selector, dispatcher/admin displays) can stay in sync
// by reading from a single source if this ever expands again.
const VALID_EMERGENCY_TYPES = ['medical'];
const VALID_SEVERITIES = ['critical', 'urgent', 'moderate', 'unknown'];

// Validates an incoming emergency call before it's allowed to hit the database.
// This is the "validate request information" use case — runs as middleware
// before createCall, so the controller can assume the body is already sane.
const validateCreateCall = [
  body('caller_phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9+\-\s()]{6,20}$/).withMessage('Phone number format looks invalid'),

  body('emergency_type')
    .optional()
    .isIn(VALID_EMERGENCY_TYPES).withMessage(`emergency_type must be: ${VALID_EMERGENCY_TYPES.join(', ')}`),

  body('severity')
    .optional()
    .isIn(VALID_SEVERITIES).withMessage(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`),

  body('latitude')
    .notEmpty().withMessage('A confirmed location is required')
    .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),

  body('longitude')
    .notEmpty().withMessage('A confirmed location is required')
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),

  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 }).withMessage('description must be under 1000 characters'),

  // Final middleware: collects any errors raised above and short-circuits with 400
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request information',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
      });
    }
    next();
  }
];

module.exports = { validateCreateCall };
