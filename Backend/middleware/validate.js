const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ msg: e.msg, param: e.param }));
  next(new AppError('Validation failed', 400, details));
}

module.exports = validate;



