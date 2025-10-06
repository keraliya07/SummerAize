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
  
  try {
    console.log(`Starting summary generation for document: ${record.originalName}`);
    
    const buffer = await getDriveFileBuffer(record.driveFileId);
    console.log(`Downloaded buffer size: ${buffer.length} bytes`);
    
    const text = await require('pdf-parse')(buffer, {
      max: 0,
      version: 'v1.10.100'
    }).then((d) => d.text);
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF. The document may be image-based or corrupted.');
    }
    
    console.log(`Extracted text length: ${text.length} characters`);
    
    const { summaryText, modelName } = await summarizeTextWithGroq({ text, model });
    
    record.summaryText = summaryText;
    record.summaryModel = modelName;
    record.summaryAt = new Date();
    await record.save();
    
    console.log(`Summary generation completed for: ${record.originalName}`);
    
    return { id: record._id, summaryText: record.summaryText, webViewLink: record.webViewLink };
  } catch (error) {
    console.error(`Summary generation failed for ${record.originalName}:`, error.message);
    
    record.summaryText = `Summary generation failed: ${error.message}`;
    record.summaryModel = 'error';
    record.summaryAt = new Date();
    await record.save();
    
    throw error;
  }
}

async function deleteSummaryRecord(params) {
  const { summaryId, userId } = params;
  const { deleteFileFromDrive } = require('./driveService');
  
  console.log(`Attempting to delete summary record: ${summaryId} for user: ${userId}`);
  
  try {
    const record = await Summary.findById(summaryId);
    if (!record) {
      console.log(`Summary record not found: ${summaryId}`);
      throw new Error('Summary record not found');
    }
    
    console.log(`Found record: ${record.originalName}, owner: ${record.userId}`);
    
    const isOwner = String(record.userId) === String(userId);
    if (!isOwner) {
      console.log(`Access denied: User ${userId} is not owner of record ${summaryId}`);
      throw new Error('Forbidden: You can only delete your own documents');
    }
    
    console.log(`Attempting to delete file from Google Drive: ${record.driveFileId}`);
    
    try {
      const driveResult = await deleteFileFromDrive({ fileId: record.driveFileId });
      console.log('Google Drive deletion result:', driveResult);
    } catch (driveError) {
      console.warn('Failed to delete file from Google Drive:', driveError.message);
    }
    
    console.log(`Deleting database record: ${summaryId}`);
    const deleteResult = await Summary.findByIdAndDelete(summaryId);
    
    if (!deleteResult) {
      console.error(`Failed to delete database record: ${summaryId}`);
      throw new Error('Failed to delete database record');
    }
    
    console.log(`Successfully deleted summary record: ${summaryId}`);
    return { success: true, message: 'Document and summary deleted successfully' };
  } catch (error) {
    console.error(`Error in deleteSummaryRecord: ${error.message}`);
    throw error;
  }
}

module.exports = { 
  saveSummaryRecord, 
  listSummariesByUser, 
  generateAndStoreSummary, 
  generateDocumentHash, 
  checkDuplicateDocument,
  quickDuplicateCheck,
  deleteSummaryRecord
};



