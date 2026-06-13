const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (_req, file, callback) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(new ApiError(415, 'Only JPG, PNG, and WEBP images are allowed.'));
  }

  return callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

module.exports = { upload };
