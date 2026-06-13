const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config/env');

function getEvidenceKey() {
  return crypto.createHash('sha256').update(env.JWT_SECRET || 'safeher-local-evidence-key').digest();
}

async function encryptEvidenceFile(filePath) {
  const raw = await fs.readFile(filePath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEvidenceKey(), iv);
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encryptedPath = `${filePath}.enc`;
  await fs.writeFile(encryptedPath, Buffer.concat([iv, authTag, encrypted]));
  await fs.unlink(filePath).catch(() => {});
  return {
    encryptedPath,
    relativePath: `/uploads/evidence/${path.basename(encryptedPath)}`,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    sizeBytes: raw.length,
  };
}

module.exports = { encryptEvidenceFile };
