const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError('Not Found', 404));
}

function errorHandler(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: err.message, code: err.code });
  }
  const isKnown = err instanceof AppError;
  const status = isKnown ? err.statusCode : 500;
  const message = isKnown ? err.message : 'Internal Server Error';
  const payload = { message };
  if (isKnown && err.details) payload.details = err.details;
  try {
    const log = {
      time: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      message: isKnown ? message : err && err.message ? err.message : String(err),
    };
    if (!isKnown && err && err.stack) log.stack = err.stack;
    console.error('Error', log);
  } catch (_) {}
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };



