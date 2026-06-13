const express = require('express');

const controller = require('../controllers/incidentController');
const { requireAuth } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listIncidents);
router.get('/:id', controller.getIncidentById);
router.post('/', upload.single('image'), controller.createIncident);

module.exports = router;
