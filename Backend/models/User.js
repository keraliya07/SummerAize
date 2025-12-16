const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { 
      type: String, 
      required: function() { return !this.googleId; },
      default: null
    },
    googleId: { type: String, sparse: true, unique: true },
    profilePicture: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = async function (plainPassword) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// statics is used for static methods(can be called on the model itself)
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

module.exports = mongoose.model('User', userSchema);


