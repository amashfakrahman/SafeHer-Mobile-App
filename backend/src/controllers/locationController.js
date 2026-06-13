const crypto = require('crypto');
const { getDb } = require('../config/database');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const { dispatchSosToTrustedContacts } = require('../utils/notificationService');
const { assertValidCoordinates, parseNullableNumber, sanitizeText } = require('../utils/formatters');

function isShareExpired(share) {
  if (!share?.expires_at) return false;
  return new Date(share.expires_at).getTime() <= Date.now();
}

async function getActiveShareRecord(db, userId) {
  return db.get(
    `SELECT * FROM location_shares
     WHERE user_id = ?
       AND is_active = 1
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );
}

function buildShareUrl(shareToken) {
  return `${env.APP_BASE_URL}/api/public/share/${shareToken}`;
}

function withShareUrl(share) {
  return share ? {
    ...share,
    shareUrl: buildShareUrl(share.share_token),
    expiresAt: share.expires_at || null,
    revokedAt: share.revoked_at || null,
    isExpired: isShareExpired(share),
  } : null;
}

function createShareToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseExpiry(body) {
  if (body.expiresInMinutes === undefined || body.expiresInMinutes === null || body.expiresInMinutes === '') {
    return null;
  }

  const requested = Number(body.expiresInMinutes);
  if (!Number.isFinite(requested)) {
    throw new ApiError(422, 'Share expiry must be a valid number of minutes.');
  }

  const minutes = Math.max(15, Math.min(24 * 60, Math.round(requested)));
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function parseLocationPayload(body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = parseNullableNumber(body.accuracy);
  const speed = parseNullableNumber(body.speed);
  const heading = parseNullableNumber(body.heading);

  if (!assertValidCoordinates(latitude, longitude)) {
    throw new ApiError(422, 'Latitude and longitude must be valid coordinates.');
  }

  return { latitude, longitude, accuracy, speed, heading };
}

async function insertLocationLog(db, userId, { latitude, longitude, accuracy, speed = null, heading = null }, source) {
  const result = await db.run(
    `INSERT INTO location_logs (user_id, latitude, longitude, accuracy, speed, heading, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, latitude, longitude, accuracy, speed, heading, source]
  );
  return db.get('SELECT * FROM location_logs WHERE id = ?', [result.lastID]);
}

async function createShare(db, userId, note, location, expiresAt = null) {
  const result = await db.run(
    `INSERT INTO location_shares (user_id, share_token, note, last_latitude, last_longitude, last_accuracy, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, createShareToken(), note, location.latitude, location.longitude, location.accuracy, expiresAt]
  );
  return db.get('SELECT * FROM location_shares WHERE id = ?', [result.lastID]);
}

async function updateShareLocation(db, shareId, location, options = {}) {
  const hasNote = Object.prototype.hasOwnProperty.call(options, 'note');
  const hasExpiry = Object.prototype.hasOwnProperty.call(options, 'expiresAt');

  if (hasNote || hasExpiry) {
    const current = await db.get('SELECT note, expires_at FROM location_shares WHERE id = ?', [shareId]);
    await db.run(
      `UPDATE location_shares
       SET note = ?, expires_at = ?, last_latitude = ?, last_longitude = ?, last_accuracy = ?
       WHERE id = ?`,
      [
        hasNote ? options.note : current.note,
        hasExpiry ? options.expiresAt : current.expires_at,
        location.latitude,
        location.longitude,
        location.accuracy,
        shareId,
      ]
    );
  } else {
    await db.run(
      `UPDATE location_shares
       SET last_latitude = ?, last_longitude = ?, last_accuracy = ?
       WHERE id = ?`,
      [location.latitude, location.longitude, location.accuracy, shareId]
    );
  }

  return db.get('SELECT * FROM location_shares WHERE id = ?', [shareId]);
}

async function logLocation(req, res, next) {
  const db = await getDb();
  try {
    const location = parseLocationPayload(req.body);
    const source = sanitizeText(req.body.source || 'manual', 80);

    await db.exec('BEGIN IMMEDIATE');
    const savedLocation = await insertLocationLog(db, req.user.id, location, source);

    const activeShare = await getActiveShareRecord(db, req.user.id);
    if (activeShare) {
      await updateShareLocation(db, activeShare.id, location);
    }
    await db.exec('COMMIT');

    res.status(201).json({ success: true, data: savedLocation });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function getLatestLocation(req, res, next) {
  try {
    const db = await getDb();
    const location = await db.get(
      `SELECT * FROM location_logs
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [req.user.id]
    );

    res.json({ success: true, data: location || null });
  } catch (error) {
    next(error);
  }
}

async function startSharing(req, res, next) {
  const db = await getDb();
  try {
    const location = parseLocationPayload(req.body);
    const note = sanitizeText(req.body.note || 'Emergency live location sharing started.', 500);
    const expiresAt = parseExpiry(req.body);

    await db.exec('BEGIN IMMEDIATE');
    let activeShare = await getActiveShareRecord(db, req.user.id);

    if (activeShare) {
      activeShare = await updateShareLocation(db, activeShare.id, location, { note, expiresAt });
    } else {
      activeShare = await createShare(db, req.user.id, note, location, expiresAt);
    }

    await insertLocationLog(db, req.user.id, location, 'share-start');
    await db.exec('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Live location sharing started.',
      data: withShareUrl(activeShare),
    });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function updateShare(req, res, next) {
  const db = await getDb();
  try {
    const location = parseLocationPayload(req.body);
    const source = sanitizeText(req.body.source || 'share-update', 80);

    await db.exec('BEGIN IMMEDIATE');
    const activeShare = await getActiveShareRecord(db, req.user.id);
    if (!activeShare) {
      throw new ApiError(404, 'No active share session found. Start sharing before sending updates.');
    }

    const updatedShare = await updateShareLocation(db, activeShare.id, location);
    await insertLocationLog(db, req.user.id, location, source);
    await db.exec('COMMIT');

    res.json({
      success: true,
      message: 'Live location updated.',
      data: withShareUrl(updatedShare),
    });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

async function stopSharing(req, res, next) {
  try {
    const db = await getDb();
    const activeShare = await getActiveShareRecord(db, req.user.id);

    if (!activeShare) {
      throw new ApiError(404, 'No active share session found.');
    }

    await db.run(
      `UPDATE location_shares
       SET is_active = 0, ended_at = CURRENT_TIMESTAMP, revoked_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [activeShare.id]
    );

    res.json({ success: true, message: 'Live location sharing stopped and private link revoked.' });
  } catch (error) {
    next(error);
  }
}

async function getActiveShare(req, res, next) {
  try {
    const db = await getDb();
    const activeShare = await getActiveShareRecord(db, req.user.id);

    res.json({ success: true, data: withShareUrl(activeShare) });
  } catch (error) {
    next(error);
  }
}

async function triggerSos(req, res, next) {
  const db = await getDb();
  try {
    const location = parseLocationPayload(req.body);
    const address = sanitizeText(req.body.address || 'Current location unavailable', 500);
    const customMessage = sanitizeText(req.body.message || 'Emergency SOS triggered.', 500);

    const trustedContacts = await db.all(
      `SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY is_primary DESC, name COLLATE NOCASE ASC`,
      [req.user.id]
    );

    if (trustedContacts.length === 0) {
      throw new ApiError(400, 'Add at least one trusted contact before using SOS.');
    }

    await db.exec('BEGIN IMMEDIATE');
    let activeShare = await getActiveShareRecord(db, req.user.id);
    if (!activeShare) {
      activeShare = await createShare(db, req.user.id, 'Started automatically from SOS flow', location, new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString());
    } else {
      activeShare = await updateShareLocation(db, activeShare.id, location);
    }

    await insertLocationLog(db, req.user.id, location, 'sos');

    const sosResult = await db.run(
      `INSERT INTO sos_events (user_id, share_id, latitude, longitude, accuracy, address, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, activeShare.id, location.latitude, location.longitude, location.accuracy, address, customMessage, 'sent']
    );
    const sosEvent = await db.get('SELECT * FROM sos_events WHERE id = ?', [sosResult.lastID]);
    await db.exec('COMMIT');

    const shareUrl = buildShareUrl(activeShare.share_token);
    let notificationResult = { deliveries: [], deliveryWarning: null };

    try {
      notificationResult = await dispatchSosToTrustedContacts({
        user: {
          id: req.user.id,
          full_name: req.user.fullName,
        },
        contacts: trustedContacts,
        shareUrl,
        latitude: location.latitude,
        longitude: location.longitude,
        sosEventId: sosEvent.id,
      });
    } catch (_deliveryError) {
      try {
        await db.run('UPDATE sos_events SET status = ? WHERE id = ?', ['sent_delivery_warning', sosEvent.id]);
        sosEvent.status = 'sent_delivery_warning';
      } catch (_statusError) {}
      notificationResult = {
        deliveries: [],
        deliveryWarning: 'SOS was saved and live sharing is active, but alert delivery records could not be completed.',
      };
    }

    res.status(201).json({
      success: true,
      message: notificationResult.deliveryWarning || 'SOS alert sent successfully.',
      data: {
        sosEvent,
        share: withShareUrl(activeShare),
        deliveries: notificationResult.deliveries,
        deliveryWarning: notificationResult.deliveryWarning || null,
      },
    });
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch (_rollbackError) {}
    next(error);
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPublicSharePage(data) {
  const lat = data.latestLocation?.latitude || data.lastLatitude;
  const lng = data.latestLocation?.longitude || data.lastLongitude;
  const mapUrl = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '#';
  const status = data.isActive ? 'LIVE' : 'ENDED';
  const badgeBg = data.isActive ? '#173B27' : '#3B1717';
  const badgeColor = data.isActive ? '#58D391' : '#FF4A4A';
  const coords = lat && lng ? `${lat}, ${lng}` : 'Location unavailable or link inactive';
  const updated = data.latestLocation?.created_at || data.endedAt || data.startedAt || '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SafeHer Live Location</title>
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#0B0B0F;color:#fff;}
    .wrap{min-height:100vh;padding:22px;box-sizing:border-box;background:radial-gradient(circle at top right,rgba(249,42,42,.25),transparent 36%),#0B0B0F;}
    .card{max-width:620px;margin:0 auto;background:#151519;border:1px solid #2A2A32;border-radius:28px;padding:22px;box-shadow:0 22px 60px rgba(0,0,0,.35);}
    .badge{display:inline-block;background:${badgeBg};color:${badgeColor};border-radius:999px;padding:8px 12px;font-weight:900;letter-spacing:.08em;font-size:12px;}
    h1{font-size:30px;line-height:1.08;margin:18px 0 8px;}
    p{color:#CFC7C7;line-height:1.55;}
    .map{height:300px;border-radius:24px;background:#211717;position:relative;overflow:hidden;margin:20px 0;border:1px solid #402222;}
    .grid:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:80px 80px;}
    .pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:92px;height:92px;border-radius:50%;background:rgba(249,42,42,.18);display:flex;align-items:center;justify-content:center;}
    .pin span{width:34px;height:34px;border-radius:50%;background:#F92A2A;border:7px solid #fff;box-shadow:0 12px 30px rgba(249,42,42,.45);}
    .row{display:flex;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid #2A2A32;padding-top:14px;margin-top:14px;flex-wrap:wrap;}
    a.button{display:inline-block;background:#F92A2A;color:#fff;text-decoration:none;border-radius:999px;padding:14px 18px;font-weight:900;}
    code{word-break:break-word;color:#fff;background:#211717;border-radius:12px;padding:10px;display:block;}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <span class="badge" id="status">${status}</span>
      <h1>${escapeHtml(data.ownerName)} is sharing live location</h1>
      <p>${escapeHtml(data.note || 'SafeHer private location share')}</p>
      <div class="map grid"><div class="pin"><span></span></div></div>
      <div class="row">
        <div style="flex:1;min-width:220px">
          <p style="margin:0 0 8px;font-weight:800;color:#fff">Current GPS</p>
          <code id="coords">${escapeHtml(coords)}</code>
          <p id="updated">Updated: ${escapeHtml(updated)}</p>
        </div>
        <a class="button" id="maps" href="${mapUrl}" target="_blank" rel="noreferrer">Open map</a>
      </div>
    </section>
  </main>
  <script>
    async function refresh(){
      try{
        const res=await fetch(location.pathname+'?format=json',{headers:{Accept:'application/json'}});
        const payload=await res.json();
        const data=payload.data;
        const lat=(data.latestLocation&&data.latestLocation.latitude)||data.lastLatitude;
        const lng=(data.latestLocation&&data.latestLocation.longitude)||data.lastLongitude;
        document.getElementById('status').textContent=data.isActive?'LIVE':'ENDED';
        document.getElementById('coords').textContent=lat&&lng?lat+', '+lng:'Location unavailable or link inactive';
        document.getElementById('updated').textContent='Updated: '+((data.latestLocation&&data.latestLocation.created_at)||data.endedAt||data.startedAt||'');
        document.getElementById('maps').href=lat&&lng?'https://maps.google.com/?q='+lat+','+lng:'#';
      }catch(e){}
    }
    setInterval(refresh,5000);
  </script>
</body>
</html>`;
}

async function getPublicShare(req, res, next) {
  try {
    const db = await getDb();
    const token = sanitizeText(req.params.token || '', 128);
    const share = await db.get(
      `SELECT ls.*, u.full_name
       FROM location_shares ls
       INNER JOIN users u ON u.id = ls.user_id
       WHERE ls.share_token = ?`,
      [token]
    );

    if (!share) {
      throw new ApiError(404, 'This shared location link is invalid.');
    }

    const active = Boolean(share.is_active) && !share.revoked_at && !isShareExpired(share);
    if (active) {
      await db.run('UPDATE location_shares SET last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?', [share.id]);
    }

    const latestLocation = active
      ? await db.get(
        `SELECT latitude, longitude, accuracy, created_at
         FROM location_logs
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [share.user_id]
      )
      : null;

    const responseData = {
      ownerName: share.full_name,
      isActive: active,
      note: share.note,
      startedAt: share.started_at,
      endedAt: share.ended_at,
      expiresAt: share.expires_at,
      revokedAt: share.revoked_at,
      lastViewedAt: share.last_viewed_at,
      lastLatitude: active ? share.last_latitude : null,
      lastLongitude: active ? share.last_longitude : null,
      lastAccuracy: active ? share.last_accuracy : null,
      latestLocation,
    };

    if (req.query.format !== 'json' && req.accepts('html')) {
      res.type('html').send(renderPublicSharePage(responseData));
      return;
    }

    res.json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  logLocation,
  getLatestLocation,
  startSharing,
  updateShare,
  stopSharing,
  getActiveShare,
  triggerSos,
  getPublicShare,
};
