const express = require('express');
const controller = require('../controllers/communityController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);
router.get('/posts', controller.listPosts);
router.post('/posts', controller.createPost);
router.post('/posts/:id/like', controller.toggleLike);
router.get('/posts/:id/comments', controller.listComments);
router.post('/posts/:id/comments', controller.createComment);
router.post('/posts/:id/share', controller.recordShare);
router.post('/posts/:id/report', controller.reportPost);
module.exports = router;
