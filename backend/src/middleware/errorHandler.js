const multer = require('multer');

function getStatusCode(error) {
  if (error.statusCode) return error.statusCode;
  if (error instanceof multer.MulterError) return 413;
  if (error.type === 'entity.too.large') return 413;
  return 500;
}

function getMessage(error, statusCode) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return 'Uploaded file is too large.';
    return error.message;
  }
  if (error.type === 'entity.too.large') return 'Request body is too large.';
  if (statusCode >= 500) return 'Something went wrong. Please try again.';
  return error.message || 'Something went wrong.';
}

function errorHandler(error, req, res, _next) {
  const statusCode = getStatusCode(error);
  const message = getMessage(error, statusCode);

  if (statusCode >= 500) {
    console.error({ requestId: req.id, error });
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null,
    requestId: req.id,
  });
}

module.exports = { errorHandler };
