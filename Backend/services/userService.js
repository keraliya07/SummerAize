const mongoose = require('mongoose');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendWelcomeEmail } = require('./emailService');

async function addUser({ username, email, password, role = 'user' }) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const existing = await User.findOne({ email }).session(session);
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create([
      { 
        username, 
        email, 
        passwordHash, 
        role
      }
    ], { session });

    await sendWelcomeEmail(email, username);

    await session.commitTransaction();
    return user[0];
  } catch (err) {
    await session.abortTransaction();
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to create user', 500, { cause: err.message });
  } finally {
    session.endSession();
  }
}

async function verifyUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }
  
  const ok = await user.verifyPassword(password);
  if (!ok) {
    throw new AppError('Invalid credentials', 401);
  }
  return user;
}

async function deleteUser({ userId }) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await User.deleteOne({ _id: userId }).session(session);
    await session.commitTransaction();
    if (result.deletedCount !== 1) {
      throw new AppError('User not found', 404);
    }
    return true;
  } catch (err) {
    await session.abortTransaction();
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to delete user', 500, { cause: err.message });
  } finally {
    session.endSession();
  }
}

module.exports = { addUser, verifyUser, deleteUser };



