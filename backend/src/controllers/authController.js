const { getDb } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { sanitizeText, serializeUser } = require('../utils/formatters');

async function register(req, res, next) {
  try {
    const db = await getDb();
    const fullName = sanitizeText(req.body.fullName);
    const email = sanitizeText(req.body.email).toLowerCase();
    const phone = sanitizeText(req.body.phone);
    const password = req.body.password;

    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUser) {
      throw new ApiError(409, 'An account with that email or phone already exists.');
    }

    const passwordHash = await hashPassword(password);
    const result = await db.run(
      `INSERT INTO users (full_name, email, phone, password_hash)
       VALUES (?, ?, ?, ?)`,
      [fullName, email, phone, passwordHash]
    );

    const user = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = signToken({ userId: user.id });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const db = await getDb();
    const identifier = sanitizeText(req.body.identifier).toLowerCase();
    const password = req.body.password;

    const user = await db.get(
      'SELECT * FROM users WHERE lower(email) = ? OR phone = ?',
      [identifier, identifier]
    );

    if (!user) {
      throw new ApiError(401, 'Invalid login credentials.');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid login credentials.');
    }

    const token = signToken({ userId: user.id });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        token,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const counts = await db.get(
      `SELECT
         (SELECT COUNT(*) FROM trusted_contacts WHERE user_id = ?) AS trustedContactCount,
         (SELECT COUNT(*) FROM incidents WHERE user_id = ?) AS incidentCount,
         (SELECT COUNT(*) FROM location_shares WHERE user_id = ? AND is_active = 1) AS activeShareCount`,
      [req.user.id, req.user.id, req.user.id]
    );

    res.json({
      success: true,
      data: {
        user: serializeUser(user),
        stats: counts,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const db = await getDb();
    const fullName = sanitizeText(req.body.fullName);
    const phone = sanitizeText(req.body.phone);

    const existingPhoneUser = await db.get(
      'SELECT id FROM users WHERE phone = ? AND id != ?',
      [phone, req.user.id]
    );

    if (existingPhoneUser) {
      throw new ApiError(409, 'That phone number is already used by another account.');
    }

    await db.run(
      `UPDATE users
       SET full_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fullName, phone, req.user.id]
    );

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      message: 'Profile updated.',
      data: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const db = await getDb();
    const themePreference = sanitizeText(req.body.themePreference || 'system');

    await db.run(
      `UPDATE users
       SET theme_preference = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [themePreference, req.user.id]
    );

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'Settings updated.',
      data: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  updateSettings,
};
