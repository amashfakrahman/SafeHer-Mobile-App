const { getDb } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { sanitizeText } = require('../utils/formatters');

async function listContacts(req, res, next) {
  try {
    const db = await getDb();
    const contacts = await db.all(
      `SELECT * FROM trusted_contacts
       WHERE user_id = ?
       ORDER BY is_primary DESC, name COLLATE NOCASE ASC`,
      [req.user.id]
    );

    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
}

function buildPayload(body) {
  return {
    name: sanitizeText(body.name, 120),
    phone: sanitizeText(body.phone || '', 40),
    email: sanitizeText((body.email || '').toLowerCase(), 120),
    relationship: sanitizeText(body.relationship || '', 80),
    notes: sanitizeText(body.notes || '', 500),
    isPrimary: Number(body.isPrimary) ? 1 : 0,
  };
}

function assertContactPayload(payload) {
  if (!payload.name || payload.name.length < 2) {
    throw new ApiError(422, 'Contact name must be at least 2 characters.');
  }
  if (!payload.phone && !payload.email) {
    throw new ApiError(422, 'Please provide at least a phone number or email for the contact.');
  }
}

async function createContact(req, res, next) {
  const db = await getDb();
  try {
    const payload = buildPayload(req.body);
    assertContactPayload(payload);

    await db.exec('BEGIN IMMEDIATE');
    if (payload.isPrimary) {
      await db.run('UPDATE trusted_contacts SET is_primary = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [req.user.id]);
    }

    const result = await db.run(
      `INSERT INTO trusted_contacts (user_id, name, phone, email, relationship, is_primary, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, payload.name, payload.phone, payload.email, payload.relationship, payload.isPrimary, payload.notes]
    );
    await db.exec('COMMIT');

    const contact = await db.get('SELECT * FROM trusted_contacts WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, message: 'Trusted contact added.', data: contact });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function updateContact(req, res, next) {
  const db = await getDb();
  try {
    const contactId = Number(req.params.id);
    const existingContact = await db.get(
      'SELECT * FROM trusted_contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (!existingContact) {
      throw new ApiError(404, 'Trusted contact not found.');
    }

    const payload = buildPayload(req.body);
    assertContactPayload(payload);

    await db.exec('BEGIN IMMEDIATE');
    if (payload.isPrimary) {
      await db.run('UPDATE trusted_contacts SET is_primary = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id != ?', [req.user.id, contactId]);
    }

    await db.run(
      `UPDATE trusted_contacts
       SET name = ?, phone = ?, email = ?, relationship = ?, is_primary = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [payload.name, payload.phone, payload.email, payload.relationship, payload.isPrimary, payload.notes, contactId, req.user.id]
    );
    await db.exec('COMMIT');

    const contact = await db.get('SELECT * FROM trusted_contacts WHERE id = ?', [contactId]);
    res.json({ success: true, message: 'Trusted contact updated.', data: contact });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function deleteContact(req, res, next) {
  try {
    const db = await getDb();
    const contactId = Number(req.params.id);
    const contact = await db.get(
      'SELECT * FROM trusted_contacts WHERE id = ? AND user_id = ?',
      [contactId, req.user.id]
    );

    if (!contact) {
      throw new ApiError(404, 'Trusted contact not found.');
    }

    await db.run('DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?', [contactId, req.user.id]);
    res.json({ success: true, message: 'Trusted contact deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
};
