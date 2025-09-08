const Summary = require('../models/Summary');

async function saveSummaryRecord(params) {
  const { userId, originalName, mimeType, sizeBytes, driveFileId, webViewLink, webContentLink } = params;
  const summary = await Summary.create({
    userId,
    originalName,
    mimeType,
    sizeBytes,
    driveFileId,
    webViewLink,
    webContentLink
  });
  return summary;
}

async function listSummariesByUser(userId) {
  return Summary.find({ userId }).sort({ createdAt: -1 }).lean();
}

module.exports = { saveSummaryRecord, listSummariesByUser };



