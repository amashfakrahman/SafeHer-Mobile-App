const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const evidenceDir = path.join(env.UPLOAD_DIR, 'evidence');
fs.mkdirSync(evidenceDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, evidenceDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.bin';
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/3gpp',
  'audio/3gpp2',
  'audio/webm',
  'application/octet-stream',
]);

const fileFilter = (_req, file, callback) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(new ApiError(415, 'Only image, video, and audio evidence files are allowed.'));
  }
  return callback(null, true);
};

const evidenceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

module.exports = { evidenceUpload };
