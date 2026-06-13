const express = require('express');

const controller = require('../controllers/evidenceController');
const { requireAuth } = require('../middleware/authMiddleware');
const { evidenceUpload } = require('../middleware/evidenceUpload');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listEvidence);
router.post('/', evidenceUpload.single('file'), controller.createEvidence);
router.post('/:id/panic-upload', controller.markPanicUploaded);

module.exports = router;
