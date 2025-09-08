const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  let token = null;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (authHeader) {
    token = authHeader;
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }
  if (!token) {
    if ((process.env.DEBUG_AUTH || '').toLowerCase() === 'true') {
      console.warn('Auth debug: missing or malformed Authorization header', { header: authHeader });
    }
    return next(new AppError('Authentication required', 401));
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (_) {
    if ((process.env.DEBUG_AUTH || '').toLowerCase() === 'true') {
      try {
        const parts = token.split('.');
        console.warn('Auth debug: token parts', { has3parts: parts.length === 3, header: parts[0]?.length, payload: parts[1]?.length });
      } catch {}
      console.warn('Auth debug: token verification failed');
    }
    return next(new AppError('Invalid or expired token', 401));
  }
}

module.exports = auth;




