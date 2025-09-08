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

module.exports = { saveSummaryRecord };



