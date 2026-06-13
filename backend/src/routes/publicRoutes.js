const express = require('express');
const { getPublicShare } = require('../controllers/locationController');

const router = express.Router();

router.get('/share/:token', getPublicShare);

module.exports = router;
