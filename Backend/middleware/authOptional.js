const { verifyToken } = require('../utils/jwt');

function authOptional(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = { id: payload.id, role: payload.role };
    } catch (_) {}
  }
  next();
}

module.exports = authOptional;


