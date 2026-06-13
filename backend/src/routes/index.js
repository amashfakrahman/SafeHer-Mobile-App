const express = require('express');

const authRoutes = require('./authRoutes');
const contactRoutes = require('./contactRoutes');
const locationRoutes = require('./locationRoutes');
const incidentRoutes = require('./incidentRoutes');
const helpCenterRoutes = require('./helpCenterRoutes');
const notificationRoutes = require('./notificationRoutes');
const evidenceRoutes = require('./evidenceRoutes');
const communityRoutes = require('./communityRoutes');
const publicRoutes = require('./publicRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/location', locationRoutes);
router.use('/incidents', incidentRoutes);
router.use('/help-centers', helpCenterRoutes);
router.use('/notifications', notificationRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/community', communityRoutes);
router.use('/public', publicRoutes);

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'SafeHer backend is running.',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
