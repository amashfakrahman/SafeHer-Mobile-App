const { getDb } = require('../config/database');
const { env } = require('../config/env');

async function createNotification({ userId, title, body, channel = 'system', data = {} }) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO notifications (user_id, title, body, channel, data_json, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, body, channel, JSON.stringify(data), 'created']
  );

  return db.get('SELECT * FROM notifications WHERE id = ?', [result.lastID]);
}

async function saveNotificationDelivery({ notificationId, trustedContactId = null, channel, recipient, status, response }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO notification_deliveries (notification_id, trusted_contact_id, channel, recipient, status, response_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [notificationId, trustedContactId, channel, recipient, status, JSON.stringify(response || {})]
  );
}

async function postJsonWebhook(url, secret, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch (_error) { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`Provider webhook failed with ${response.status}`);
    error.providerResponse = body;
    throw error;
  }
  return body;
}

async function sendTwilioSms({ to, body }) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    return { configured: false, status: 'not_configured', provider: 'twilio' };
  }

  const form = new URLSearchParams();
  form.set('From', env.TWILIO_FROM_NUMBER);
  form.set('To', to);
  form.set('Body', body);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || `Twilio SMS failed with ${response.status}`);
    error.providerResponse = result;
    throw error;
  }

  return { configured: true, provider: 'twilio', sid: result.sid, status: result.status || 'queued' };
}

async function sendSmsAlert({ to, body, contact, shareUrl, latitude, longitude, sosEventId }) {
  if (!to) return { configured: false, status: 'skipped', reason: 'No phone number.' };

  if (env.SOS_SMS_PROVIDER === 'twilio') {
    const result = await sendTwilioSms({ to, body });
    if (result.configured) return result;
  }

  if (env.SOS_SMS_WEBHOOK_URL) {
    const result = await postJsonWebhook(env.SOS_SMS_WEBHOOK_URL, env.SOS_SMS_WEBHOOK_SECRET, {
      to,
      body,
      contact: { id: contact.id, name: contact.name, relationship: contact.relationship },
      shareUrl,
      latitude,
      longitude,
      sosEventId,
    });
    return { configured: true, provider: 'webhook', status: 'sent', response: result };
  }

  return { configured: false, status: 'not_configured', provider: env.SOS_SMS_PROVIDER || 'none' };
}

async function sendVoiceCallAlert({ to, body, contact, shareUrl, latitude, longitude, sosEventId }) {
  if (!to) return { configured: false, status: 'skipped', reason: 'No phone number.' };
  if (!env.SOS_VOICE_WEBHOOK_URL) {
    return { configured: false, status: 'not_configured', provider: 'none' };
  }

  const result = await postJsonWebhook(env.SOS_VOICE_WEBHOOK_URL, env.SOS_VOICE_WEBHOOK_SECRET, {
    to,
    body,
    contact: { id: contact.id, name: contact.name, relationship: contact.relationship },
    shareUrl,
    latitude,
    longitude,
    sosEventId,
  });
  return { configured: true, provider: 'webhook', status: 'queued', response: result };
}

async function deliverToUserDevices(userId, message, notificationId) {
  const db = await getDb();
  const tokenRows = await db.all('SELECT expo_push_token FROM device_tokens WHERE user_id = ?', [userId]);
  const response = {
    sent: 0,
    skipped: tokenRows.length,
    mode: 'in_app_only',
    reason: 'Remote push delivery is disabled in this Expo Go-safe build.',
    message,
  };

  if (notificationId) {
    await saveNotificationDelivery({
      notificationId,
      channel: 'in_app',
      recipient: tokenRows.length > 0 ? `${tokenRows.length} registered device token(s)` : 'Current account',
      status: 'created',
      response,
    });
  }

  return response;
}

async function dispatchSosToTrustedContacts({ user, contacts, shareUrl, latitude, longitude, sosEventId }) {
  const db = await getDb();
  const messageBody = `${user.full_name} triggered an SOS alert. Current coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Live location: ${shareUrl}`;

  const userNotification = await createNotification({
    userId: user.id,
    title: 'SOS alert sent',
    body: 'Your emergency alert was created and trusted contacts were notified.',
    channel: 'sos',
    data: { sosEventId, shareUrl },
  });

  const selfDeliveryResult = await deliverToUserDevices(
    user.id,
    {
      title: 'SOS sent successfully',
      body: 'Trusted contacts were notified and live location sharing is active.',
      data: { sosEventId, shareUrl },
    },
    userNotification.id
  );

  const deliverySummary = [];

  for (const contact of contacts) {
    const phoneRecipient = contact.phone || '';
    const recipient = contact.phone || contact.email || contact.name;
    const linkedUsers = await db.all(
      `SELECT id FROM users WHERE lower(email) = lower(?) OR phone = ?`,
      [contact.email || '', contact.phone || '']
    );

    if (linkedUsers.length > 0) {
      const targetUserId = linkedUsers[0].id;
      const linkedNotification = await createNotification({
        userId: targetUserId,
        title: `SOS from ${user.full_name}`,
        body: messageBody,
        channel: 'trusted-contact',
        data: { sosEventId, shareUrl, triggeredBy: user.id },
      });

      const inAppResult = await deliverToUserDevices(
        targetUserId,
        {
          title: `SOS from ${user.full_name}`,
          body: messageBody,
          data: { sosEventId, shareUrl, triggeredBy: user.id },
        },
        linkedNotification.id
      );

      await saveNotificationDelivery({
        notificationId: userNotification.id,
        trustedContactId: contact.id,
        channel: 'in_app',
        recipient,
        status: 'created',
        response: inAppResult,
      });

      deliverySummary.push({
        id: contact.id,
        name: contact.name,
        recipient,
        channel: 'in_app',
        status: 'created',
      });
    }

    if (phoneRecipient) {
      try {
        const smsResult = await sendSmsAlert({ to: phoneRecipient, body: messageBody, contact, shareUrl, latitude, longitude, sosEventId });
        if (smsResult.configured) {
          await saveNotificationDelivery({
            notificationId: userNotification.id,
            trustedContactId: contact.id,
            channel: 'sms',
            recipient: phoneRecipient,
            status: smsResult.status === 'sent' || smsResult.status === 'queued' ? 'sent' : smsResult.status,
            response: smsResult,
          });
          deliverySummary.push({ id: contact.id, name: contact.name, recipient: phoneRecipient, channel: 'sms', status: 'sent' });
        } else if (linkedUsers.length === 0) {
          const providerReadyPayload = {
            preview: `Provider-ready alert prepared for ${recipient}`,
            shareUrl,
            messageBody,
            note: 'Configure SOS_SMS_PROVIDER=twilio or SOS_SMS_WEBHOOK_URL before public launch for automatic server-side SMS.',
          };
          await saveNotificationDelivery({
            notificationId: userNotification.id,
            trustedContactId: contact.id,
            channel: 'provider_pending',
            recipient,
            status: 'prepared',
            response: providerReadyPayload,
          });
          deliverySummary.push({ id: contact.id, name: contact.name, recipient, channel: 'provider_pending', status: 'prepared' });
        }
      } catch (smsError) {
        await saveNotificationDelivery({
          notificationId: userNotification.id,
          trustedContactId: contact.id,
          channel: 'sms',
          recipient: phoneRecipient,
          status: 'failed',
          response: { message: smsError.message, providerResponse: smsError.providerResponse || null },
        });
        deliverySummary.push({ id: contact.id, name: contact.name, recipient: phoneRecipient, channel: 'sms', status: 'failed' });
      }
    }

    if (contact.is_primary && phoneRecipient) {
      try {
        const voiceResult = await sendVoiceCallAlert({ to: phoneRecipient, body: messageBody, contact, shareUrl, latitude, longitude, sosEventId });
        if (voiceResult.configured) {
          await saveNotificationDelivery({
            notificationId: userNotification.id,
            trustedContactId: contact.id,
            channel: 'voice_call',
            recipient: phoneRecipient,
            status: 'queued',
            response: voiceResult,
          });
          deliverySummary.push({ id: contact.id, name: contact.name, recipient: phoneRecipient, channel: 'voice_call', status: 'queued' });
        }
      } catch (voiceError) {
        await saveNotificationDelivery({
          notificationId: userNotification.id,
          trustedContactId: contact.id,
          channel: 'voice_call',
          recipient: phoneRecipient,
          status: 'failed',
          response: { message: voiceError.message, providerResponse: voiceError.providerResponse || null },
        });
        deliverySummary.push({ id: contact.id, name: contact.name, recipient: phoneRecipient, channel: 'voice_call', status: 'failed' });
      }
    }
  }

  return {
    appBaseUrl: env.APP_BASE_URL,
    notification: userNotification,
    selfDeliveryResult,
    deliveries: deliverySummary,
  };
}

module.exports = {
  createNotification,
  deliverToUserDevices,
  dispatchSosToTrustedContacts,
};
