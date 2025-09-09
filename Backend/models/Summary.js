const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    driveFileId: { type: String, required: true },
    webViewLink: { type: String },
    webContentLink: { type: String },
    summaryText: { type: String },
    summaryModel: { type: String },
    summaryAt: { type: Date },
    documentHash: { type: String, required: true, index: true },
    fileSize: { type: Number, index: true }
  },
  { timestamps: true }
);

summarySchema.index({ userId: 1, documentHash: 1 }, { unique: true });

module.exports = mongoose.model('Summary', summarySchema);



