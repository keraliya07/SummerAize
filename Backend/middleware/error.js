const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError('Not Found', 404));
}

function errorHandler(err, req, res, next) {
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



