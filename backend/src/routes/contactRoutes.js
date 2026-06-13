const express = require('express');
const { body } = require('express-validator');

const controller = require('../controllers/contactController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth);

const contactValidators = [
  body('name').isLength({ min: 2 }).withMessage('Contact name must be at least 2 characters.'),
  validateRequest,
];

router.get('/', controller.listContacts);
router.post('/', contactValidators, controller.createContact);
router.put('/:id', contactValidators, controller.updateContact);
router.delete('/:id', controller.deleteContact);

module.exports = router;
