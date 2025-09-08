const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    driveFileId: { type: String, required: true },
    webViewLink: { type: String },
    webContentLink: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Summary', summarySchema);



