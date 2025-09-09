const Summary = require('../models/Summary');
const { getDriveFileBuffer } = require('./textExtractService');
const { summarizeTextWithGroq } = require('./textSummarizeService');
const crypto = require('crypto');

function generateDocumentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function checkDuplicateDocument(userId, documentHash, fileSize) {
  return await Summary.findOne({ 
    userId, 
    documentHash,
    sizeBytes: fileSize 
  }).lean();
}

async function quickDuplicateCheck(userId, fileSize) {
  const count = await Summary.countDocuments({ 
    userId, 
    sizeBytes: fileSize 
  });
  return count > 0;
}

async function saveSummaryRecord(params) {
  const { userId, originalName, mimeType, sizeBytes, driveFileId, webViewLink, webContentLink, documentHash } = params;
  const summary = await Summary.create({
    userId,
    originalName,
    mimeType,
    sizeBytes,
    driveFileId,
    webViewLink,
    webContentLink,
    documentHash
  });
  return summary;
}

async function listSummariesByUser(userId) {
  return Summary.find({ userId }).sort({ createdAt: -1 }).lean();
}

async function generateAndStoreSummary(params) {
  const { summaryId, model } = params;
  const record = await Summary.findById(summaryId);
  if (!record) throw new Error('Summary record not found');
  const buffer = await getDriveFileBuffer(record.driveFileId);
  const text = await require('pdf-parse')(buffer).then((d) => d.text);
  const { summaryText, modelName } = await summarizeTextWithGroq({ text, model });
  record.summaryText = summaryText;
  record.summaryModel = modelName;
  record.summaryAt = new Date();
  await record.save();
  return { id: record._id, summaryText: record.summaryText, webViewLink: record.webViewLink };
}

module.exports = { 
  saveSummaryRecord, 
  listSummariesByUser, 
  generateAndStoreSummary, 
  generateDocumentHash, 
  checkDuplicateDocument,
  quickDuplicateCheck
};



