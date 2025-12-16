const mongoose = require('mongoose');

const oauthTokenSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      enum: ['google-drive'],
      unique: true,
      default: 'google-drive'
    },
    accessToken: {
      type: String,
      required: false
    },
    refreshToken: {
      type: String,
      required: true
    },
    tokenType: {
      type: String,
      default: 'Bearer'
    },
    expiryDate: {
      type: Date,
      required: false
    },
    scope: {
      type: String,
      required: false
    },
    lastRefreshed: {
      type: Date,
      default: Date.now
    },
    refreshCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('OAuthToken', oauthTokenSchema);

