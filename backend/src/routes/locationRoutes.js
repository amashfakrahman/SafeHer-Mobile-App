const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/locationController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth);

const locationValidators = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.'),
  body('accuracy').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Accuracy must be a positive number.'),
  validateRequest,
];

router.get('/current', controller.getLatestLocation);
router.post('/current', locationValidators, controller.logLocation);
router.get('/share/active', controller.getActiveShare);
router.post('/share/start', locationValidators, controller.startSharing);
router.post('/share/update', locationValidators, controller.updateShare);
router.post('/share/stop', controller.stopSharing);
router.post('/sos', locationValidators, controller.triggerSos);

module.exports = router;
