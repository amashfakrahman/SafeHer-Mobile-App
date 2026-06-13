const { getDb } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { createNotification, deliverToUserDevices } = require('../utils/notificationService');
const { sanitizeText } = require('../utils/formatters');

async function registerDeviceToken(req, res, next) {
  try {
    const db = await getDb();
    const expoPushToken = sanitizeText(req.body.expoPushToken || '', 180);
    const platform = sanitizeText(req.body.platform || 'unknown', 40);

    if (!expoPushToken) {
      throw new ApiError(422, 'expoPushToken is required when using a native push-enabled build.');
    }

    await db.run(
      `INSERT INTO device_tokens (user_id, expo_push_token, platform)
       VALUES (?, ?, ?)
       ON CONFLICT(expo_push_token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform`,
      [req.user.id, expoPushToken, platform]
    );

    res.json({ success: true, message: 'Device token stored for future native notification delivery.' });
  } catch (error) {
    next(error);
  }
}

async function listNotifications(req, res, next) {
  try {
    const db = await getDb();
    const notifications = await db.all(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
}

async function sendTestNotification(req, res, next) {
  try {
    const title = sanitizeText(req.body.title || 'SafeHer test alert', 120);
    const body = sanitizeText(req.body.body || 'Your in-app alert record pipeline is ready.', 500);

    const notification = await createNotification({
      userId: req.user.id,
      title,
      body,
      channel: 'test',
      data: { type: 'test' },
    });

    const deliveryResult = await deliverToUserDevices(
      req.user.id,
      { title, body, data: { type: 'test' } },
      notification.id
    );

    res.json({
      success: true,
      message: 'Test alert record processed.',
      data: {
        notification,
        deliveryResult,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerDeviceToken,
  listNotifications,
  sendTestNotification,
};
