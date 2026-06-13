const fs = require('fs/promises');
const path = require('path');
const { getDb } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { assertValidCoordinates, parseNullableNumber, sanitizeText } = require('../utils/formatters');

const allowedCategories = new Set(['harassment', 'unsafe-area', 'suspicious-activity', 'general']);

async function cleanupUploadedFile(file) {
  if (!file?.path) return;
  try {
    await fs.unlink(file.path);
  } catch (_error) {}
}

async function listIncidents(req, res, next) {
  try {
    const db = await getDb();
    const incidents = await db.all(
      `SELECT * FROM incidents
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 100`,
      [req.user.id]
    );

    res.json({ success: true, data: incidents });
  } catch (error) {
    next(error);
  }
}

async function createIncident(req, res, next) {
  try {
    const db = await getDb();
    const title = sanitizeText(req.body.title, 160);
    const description = sanitizeText(req.body.description, 2500);
    const rawCategory = sanitizeText(req.body.category || 'general', 80);
    const category = allowedCategories.has(rawCategory) ? rawCategory : 'general';
    const latitude = parseNullableNumber(req.body.latitude);
    const longitude = parseNullableNumber(req.body.longitude);
    const imageUrl = req.file ? `/uploads/${path.basename(req.file.path)}` : null;

    if (!title || title.length < 3 || !description || description.length < 10) {
      await cleanupUploadedFile(req.file);
      throw new ApiError(422, 'Title and description are required. Description must be at least 10 characters.');
    }

    if ((latitude !== null || longitude !== null) && !assertValidCoordinates(latitude, longitude)) {
      await cleanupUploadedFile(req.file);
      throw new ApiError(422, 'Incident coordinates are invalid.');
    }

    const result = await db.run(
      `INSERT INTO incidents (user_id, title, description, category, image_url, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, category, imageUrl, latitude, longitude]
    );

    const incident = await db.get('SELECT * FROM incidents WHERE id = ?', [result.lastID]);
    res.status(201).json({
      success: true,
      message: 'Incident reported successfully.',
      data: incident,
    });
  } catch (error) {
    next(error);
  }
}

async function getIncidentById(req, res, next) {
  try {
    const db = await getDb();
    const incident = await db.get(
      'SELECT * FROM incidents WHERE id = ? AND user_id = ?',
      [Number(req.params.id), req.user.id]
    );

    if (!incident) {
      throw new ApiError(404, 'Incident not found.');
    }

    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listIncidents,
  createIncident,
  getIncidentById,
};
