const pdfParse = require('pdf-parse');
const { downloadFileBuffer } = require('./driveService');

async function getDriveFileBuffer(fileId) {
  try {
    const buffer = await downloadFileBuffer({ fileId });
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Downloaded file buffer is empty or corrupted');
    }
    
    if (buffer.length > 10 * 1024 * 1024) {
      console.warn(`Large file detected: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB. Processing may be slow.`);
    }
    
    return buffer;
  } catch (error) {
    console.error('Error downloading file buffer:', error.message);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

async function extractPdfTextFromDrive(fileId) {
  try {
    const buffer = await getDriveFileBuffer(fileId);
    
    console.log(`Processing PDF buffer: ${buffer.length} bytes`);
    
    const result = await pdfParse(buffer, {
      max: 0,
      version: 'v1.10.100'
    });
    
    if (!result.text || result.text.trim().length === 0) {
      throw new Error('No text content found in PDF. The document may be image-based or corrupted.');
    }
    
    console.log(`Extracted text length: ${result.text.length} characters`);
    
    return result.text;
  } catch (error) {
    console.error('PDF text extraction error:', error.message);
    
    if (error.message.includes('Invalid PDF')) {
      throw new Error('Invalid PDF format. Please ensure the file is a valid PDF document.');
    }
    
    if (error.message.includes('password')) {
      throw new Error('Password-protected PDFs are not supported. Please remove password protection.');
    }
    
    if (error.message.includes('corrupted')) {
      throw new Error('PDF file appears to be corrupted. Please try uploading a different file.');
    }
    
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

module.exports = { getDriveFileBuffer, extractPdfTextFromDrive };


