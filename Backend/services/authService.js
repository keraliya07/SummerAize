const { signToken } = require('../utils/jwt');
const { verifyUser } = require('./userService');

async function login({ email, password }) {
  const user = await verifyUser({ email, password });
  const token = signToken({ id: user._id.toString(), role: user.role });
  return { user, token };
}

module.exports = { login };



