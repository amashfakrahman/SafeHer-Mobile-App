const { getDb } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { assertValidCoordinates, parseNullableNumber, sanitizeText } = require('../utils/formatters');

const allowedCategories = new Set(['discussion', 'suspicious-area', 'ask-help', 'safety-tip']);
const allowedGroups = new Set(['Nearby', 'Campus', 'Transit', 'Workplace', 'Night travel']);
const allowedReportReasons = new Set(['harmful', 'misleading', 'spam', 'unsafe-advice', 'other']);

function normalizeCategory(value) {
  const category = sanitizeText(value || 'discussion', 60);
  return allowedCategories.has(category) ? category : 'discussion';
}

function normalizeGroup(value) {
  const group = sanitizeText(value || 'Nearby', 80);
  return allowedGroups.has(group) ? group : 'Nearby';
}

async function listPosts(req, res, next) {
  try {
    const db = await getDb();
    const category = normalizeCategory(req.query.category || 'discussion');
    const showAll = !req.query.category || req.query.category === 'all';
    const posts = await db.all(
      `SELECT cp.*, u.full_name,
        EXISTS(SELECT 1 FROM community_likes cl WHERE cl.post_id = cp.id AND cl.user_id = ?) AS liked_by_me,
        EXISTS(SELECT 1 FROM community_post_reports cpr WHERE cpr.post_id = cp.id AND cpr.user_id = ?) AS reported_by_me,
        (SELECT COUNT(*) FROM community_post_reports cpr WHERE cpr.post_id = cp.id) AS moderation_report_count
       FROM community_posts cp
       INNER JOIN users u ON u.id = cp.user_id
       ${showAll ? '' : 'WHERE cp.category = ?'}
       ORDER BY cp.id DESC
       LIMIT 100`,
      showAll ? [req.user.id, req.user.id] : [req.user.id, req.user.id, category]
    );

    res.json({
      success: true,
      data: posts.map((post) => ({
        ...post,
        authorName: post.is_anonymous ? 'Anonymous neighbor' : post.full_name,
        likedByMe: Boolean(post.liked_by_me),
        reportedByMe: Boolean(post.reported_by_me),
        moderationReportCount: Number(post.moderation_report_count || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function createPost(req, res, next) {
  try {
    const db = await getDb();
    const title = sanitizeText(req.body.title || '', 160);
    const body = sanitizeText(req.body.body || '', 2500);
    const category = normalizeCategory(req.body.category);
    const groupName = normalizeGroup(req.body.groupName);
    const isAnonymous = req.body.isAnonymous === false || req.body.isAnonymous === '0' ? 0 : 1;
    const latitude = parseNullableNumber(req.body.latitude);
    const longitude = parseNullableNumber(req.body.longitude);

    if (!title || title.length < 3 || !body || body.length < 8) {
      throw new ApiError(422, 'Post title and details are required.');
    }
    if ((latitude !== null || longitude !== null) && !assertValidCoordinates(latitude, longitude)) {
      throw new ApiError(422, 'Community post coordinates are invalid.');
    }

    const result = await db.run(
      `INSERT INTO community_posts (user_id, is_anonymous, title, body, category, latitude, longitude, group_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, isAnonymous, title, body, category, latitude, longitude, groupName]
    );

    const post = await db.get(
      `SELECT cp.*, u.full_name FROM community_posts cp INNER JOIN users u ON u.id = cp.user_id WHERE cp.id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Community post published.',
      data: {
        ...post,
        authorName: post.is_anonymous ? 'Anonymous neighbor' : post.full_name,
        likedByMe: false,
        reportedByMe: false,
        moderationReportCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function toggleLike(req, res, next) {
  const db = await getDb();
  try {
    const postId = Number(req.params.id);
    const post = await db.get('SELECT id FROM community_posts WHERE id = ?', [postId]);
    if (!post) throw new ApiError(404, 'Community post not found.');

    await db.exec('BEGIN IMMEDIATE');
    const existing = await db.get('SELECT 1 FROM community_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    if (existing) {
      await db.run('DELETE FROM community_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    } else {
      await db.run('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    }
    const countRow = await db.get('SELECT COUNT(*) AS count FROM community_likes WHERE post_id = ?', [postId]);
    await db.run('UPDATE community_posts SET like_count = ? WHERE id = ?', [countRow.count, postId]);
    await db.exec('COMMIT');

    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [postId]);
    res.json({ success: true, data: { ...updated, likedByMe: !existing } });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const db = await getDb();
    const postId = Number(req.params.id);
    const comments = await db.all(
      `SELECT cc.*, u.full_name
       FROM community_comments cc
       INNER JOIN users u ON u.id = cc.user_id
       WHERE cc.post_id = ?
       ORDER BY cc.id ASC
       LIMIT 100`,
      [postId]
    );
    res.json({ success: true, data: comments.map((comment) => ({ ...comment, authorName: comment.is_anonymous ? 'Anonymous neighbor' : comment.full_name })) });
  } catch (error) {
    next(error);
  }
}

async function createComment(req, res, next) {
  const db = await getDb();
  try {
    const postId = Number(req.params.id);
    const body = sanitizeText(req.body.body || '', 1000);
    const isAnonymous = req.body.isAnonymous === false || req.body.isAnonymous === '0' ? 0 : 1;
    if (!body || body.length < 2) throw new ApiError(422, 'Comment text is required.');

    await db.exec('BEGIN IMMEDIATE');
    const post = await db.get('SELECT id FROM community_posts WHERE id = ?', [postId]);
    if (!post) throw new ApiError(404, 'Community post not found.');
    const result = await db.run(
      'INSERT INTO community_comments (post_id, user_id, is_anonymous, body) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, isAnonymous, body]
    );
    const countRow = await db.get('SELECT COUNT(*) AS count FROM community_comments WHERE post_id = ?', [postId]);
    await db.run('UPDATE community_posts SET comment_count = ? WHERE id = ?', [countRow.count, postId]);
    await db.exec('COMMIT');

    const comment = await db.get(
      `SELECT cc.*, u.full_name FROM community_comments cc INNER JOIN users u ON u.id = cc.user_id WHERE cc.id = ?`,
      [result.lastID]
    );
    res.status(201).json({ success: true, data: { ...comment, authorName: comment.is_anonymous ? 'Anonymous neighbor' : comment.full_name } });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function reportPost(req, res, next) {
  try {
    const db = await getDb();
    const postId = Number(req.params.id);
    const rawReason = sanitizeText(req.body.reason || 'other', 80);
    const reason = allowedReportReasons.has(rawReason) ? rawReason : 'other';
    const post = await db.get('SELECT id FROM community_posts WHERE id = ?', [postId]);
    if (!post) throw new ApiError(404, 'Community post not found.');

    await db.run(
      `INSERT INTO community_post_reports (post_id, user_id, reason)
       VALUES (?, ?, ?)
       ON CONFLICT(post_id, user_id) DO UPDATE SET reason = excluded.reason, status = 'open', created_at = CURRENT_TIMESTAMP`,
      [postId, req.user.id, reason]
    );

    const countRow = await db.get('SELECT COUNT(*) AS count FROM community_post_reports WHERE post_id = ?', [postId]);
    res.json({
      success: true,
      message: 'Post sent to moderation.',
      data: { postId, reportedByMe: true, moderationReportCount: countRow.count, reason },
    });
  } catch (error) {
    next(error);
  }
}

async function recordShare(req, res, next) {
  try {
    const db = await getDb();
    const postId = Number(req.params.id);
    const post = await db.get('SELECT id FROM community_posts WHERE id = ?', [postId]);
    if (!post) throw new ApiError(404, 'Community post not found.');
    await db.run('UPDATE community_posts SET share_count = share_count + 1 WHERE id = ?', [postId]);
    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [postId]);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = { listPosts, createPost, toggleLike, listComments, createComment, recordShare, reportPost };
