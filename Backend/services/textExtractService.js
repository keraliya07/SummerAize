const pdfParse = require('pdf-parse');
const { downloadFileBuffer } = require('./driveService');

async function getDriveFileBuffer(fileId) {
  return downloadFileBuffer({ fileId });
}

async function extractPdfTextFromDrive(fileId) {
  const buffer = await getDriveFileBuffer(fileId);
  const result = await pdfParse(buffer);
  return result.text;
}

module.exports = { getDriveFileBuffer, extractPdfTextFromDrive };


