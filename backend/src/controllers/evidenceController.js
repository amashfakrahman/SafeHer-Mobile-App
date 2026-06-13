const { getDb } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { sanitizeText } = require('../utils/formatters');
const { encryptEvidenceFile } = require('../utils/evidenceCrypto');

const allowedTypes = new Set(['photo', 'video', 'audio', 'note']);

async function listEvidence(req, res, next) {
  try {
    const db = await getDb();
    const items = await db.all(
      `SELECT id, type, title, note, encrypted_file_url, mime_type, size_bytes, cloud_status, panic_uploaded, created_at
       FROM evidence_items
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

async function createEvidence(req, res, next) {
  try {
    const db = await getDb();
    const rawType = sanitizeText(req.body.type || 'note', 40);
    const type = allowedTypes.has(rawType) ? rawType : 'note';
    const title = sanitizeText(req.body.title || 'Evidence item', 160);
    const note = sanitizeText(req.body.note || '', 2500);
    const panicUploaded = req.body.panicUploaded === '1' || req.body.panicUploaded === 1 ? 1 : 0;

    if (!title || title.length < 2) {
      throw new ApiError(422, 'Evidence title is required.');
    }

    let encrypted = null;
    if (req.file?.path) {
      encrypted = await encryptEvidenceFile(req.file.path);
    }

    if (type !== 'note' && !encrypted) {
      throw new ApiError(422, 'Media evidence requires a file upload.');
    }

    const result = await db.run(
      `INSERT INTO evidence_items (user_id, type, title, note, encrypted_file_url, mime_type, size_bytes, cloud_status, panic_uploaded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        type,
        title,
        note,
        encrypted?.relativePath || null,
        req.file?.mimetype || null,
        encrypted?.sizeBytes || 0,
        encrypted ? 'encrypted_backup' : 'metadata_backup',
        panicUploaded,
      ]
    );

    const item = await db.get(
      `SELECT id, type, title, note, encrypted_file_url, mime_type, size_bytes, cloud_status, panic_uploaded, created_at
       FROM evidence_items WHERE id = ?`,
      [result.lastID]
    );

    res.status(201).json({ success: true, message: 'Evidence secured successfully.', data: item });
  } catch (error) {
    next(error);
  }
}

async function markPanicUploaded(req, res, next) {
  try {
    const db = await getDb();
    const item = await db.get('SELECT * FROM evidence_items WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
    if (!item) {
      throw new ApiError(404, 'Evidence item not found.');
    }
    await db.run('UPDATE evidence_items SET panic_uploaded = 1, cloud_status = ? WHERE id = ?', ['panic_uploaded', item.id]);
    const updated = await db.get(
      `SELECT id, type, title, note, encrypted_file_url, mime_type, size_bytes, cloud_status, panic_uploaded, created_at
       FROM evidence_items WHERE id = ?`,
      [item.id]
    );
    res.json({ success: true, message: 'Evidence marked for panic upload.', data: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = { listEvidence, createEvidence, markPanicUploaded };
