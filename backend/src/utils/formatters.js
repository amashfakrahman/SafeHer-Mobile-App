function sanitizeText(value, maxLength = 1000) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertValidCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    themePreference: user.theme_preference,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

module.exports = {
  sanitizeText,
  parseNullableNumber,
  assertValidCoordinates,
  serializeUser,
};
