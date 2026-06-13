const express = require('express');
const controller = require('../controllers/helpCenterController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listHelpCenters);

module.exports = router;
