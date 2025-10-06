const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError('Not Found', 404));
}

function errorHandler(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File size exceeds the maximum allowed limit',
        maxSize: '10MB',
        code: err.code
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'Unexpected file field. Please use the correct field name.',
        code: err.code
      });
    }
    return res.status(400).json({ message: err.message, code: err.code });
  }
  
  if (err.message && err.message.includes('File size exceeds 10MB')) {
    return res.status(413).json({ 
      message: err.message,
      maxSize: '10MB'
    });
  }
  
  if (err.message && err.message.includes('buffer is empty')) {
    return res.status(400).json({ 
      message: 'File upload failed: Invalid or corrupted file',
      details: err.message
    });
  }
  
  if (err.message && (err.message.includes('PDF') || err.message.includes('pdf'))) {
    return res.status(400).json({ 
      message: 'PDF processing error',
      details: err.message
    });
  }
  
  // Groq/GPT provider input too large or TPM exceeded (treat as document too large)
  if (
    (err.status === 413) ||
    (err.code === 413) ||
    (typeof err.message === 'string' && (
      err.message.includes('Request too large for model') ||
      err.message.includes('tokens per minute') ||
      err.message.includes('rate_limit_exceeded')
    ))
  ) {
    return res.status(413).json({
      message: 'Document is too large. Please upload a smaller document.',
      code: 'DOCUMENT_TOO_LARGE'
    });
  }

  if (err.message && err.message.includes('Summarization failed')) {
    return res.status(500).json({ 
      message: 'AI summarization service error',
      details: err.message
    });
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



