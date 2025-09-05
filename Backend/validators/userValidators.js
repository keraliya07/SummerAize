const { body } = require('express-validator');

const username = body('username')
  .isString()
  .isLength({ min: 5, max: 30 })
  .trim();

const email = body('email')
  .isEmail()
  .normalizeEmail();

const password = body('password')
  .isString()
  .isLength({ min: 8, max: 128 })
  .matches(/[a-z]/)
  .matches(/[A-Z]/)
  .matches(/[0-9]/)
  .matches(/[@_-]/)
  .matches(/^[A-Za-z0-9@_-]+$/);

const loginEmail = body('email')
  .isEmail()
  .normalizeEmail();

const loginPassword = body('password')
  .isString()
  .isLength({ min: 8, max: 128 })
  .matches(/^[A-Za-z0-9@_-]+$/);

const signupValidator = [username, email, password];
const loginValidator = [loginEmail, loginPassword];

module.exports = { signupValidator, loginValidator };



