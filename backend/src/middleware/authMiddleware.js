const { getDb } = require('../config/database');
const { verifyToken } = require('../utils/jwt');
const { ApiError } = require('../utils/ApiError');
const { serializeUser } = require('../utils/formatters');

async function requireAuth(req, _res, next) {
  try {
    const authorizationHeader = req.headers.authorization || '';
    const token = authorizationHeader.startsWith('Bearer ')
      ? authorizationHeader.slice(7)
      : null;

    if (!token) {
      throw new ApiError(401, 'Authentication token is missing.');
    }

    const decoded = verifyToken(token);
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);

    if (!user) {
      throw new ApiError(401, 'The authenticated user no longer exists.');
    }

    req.user = serializeUser(user);
    req.authToken = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Your session is invalid or expired. Please log in again.'));
    }

    next(error);
  }
}

module.exports = { requireAuth };
