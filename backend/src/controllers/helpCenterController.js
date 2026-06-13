const { getDb } = require('../config/database');
const { calculateDistanceInKm } = require('../utils/location');
const { parseNullableNumber } = require('../utils/formatters');

async function listHelpCenters(req, res, next) {
  try {
    const db = await getDb();
    const requestedType = (req.query.type || 'all').toLowerCase();
    const latitude = parseNullableNumber(req.query.latitude);
    const longitude = parseNullableNumber(req.query.longitude);

    const query = requestedType === 'all'
      ? 'SELECT * FROM help_centers ORDER BY id ASC'
      : 'SELECT * FROM help_centers WHERE type = ? ORDER BY id ASC';

    const centers = requestedType === 'all'
      ? await db.all(query)
      : await db.all(query, [requestedType]);

    const withDistance = centers.map((center) => {
      const distanceKm = Number.isFinite(latitude) && Number.isFinite(longitude)
        ? calculateDistanceInKm(latitude, longitude, center.latitude, center.longitude)
        : null;

      return {
        ...center,
        distanceKm,
      };
    }).sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return a.id - b.id;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json({ success: true, data: withDistance });
  } catch (error) {
    next(error);
  }
}

module.exports = { listHelpCenters };
