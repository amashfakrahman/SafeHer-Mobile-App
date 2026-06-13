const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again shortly.',
  },
});

router.post(
  '/register',
  authLimiter,
  [
    body('fullName').isLength({ min: 2 }).withMessage('Full name must be at least 2 characters.'),
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('phone').isLength({ min: 6 }).withMessage('Please enter a valid phone number.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number.'),
    validateRequest,
  ],
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('identifier').notEmpty().withMessage('Email or phone is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    validateRequest,
  ],
  authController.login
);

router.get('/me', requireAuth, authController.getProfile);
router.put(
  '/profile',
  requireAuth,
  [
    body('fullName').isLength({ min: 2 }).withMessage('Full name must be at least 2 characters.'),
    body('phone').isLength({ min: 6 }).withMessage('Phone number is required.'),
    validateRequest,
  ],
  authController.updateProfile
);
router.put(
  '/settings',
  requireAuth,
  [
    body('themePreference')
      .isIn(['light', 'dark', 'system'])
      .withMessage('Theme preference must be light, dark, or system.'),
    validateRequest,
  ],
  authController.updateSettings
);

module.exports = router;
