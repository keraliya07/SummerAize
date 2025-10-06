const express = require('express')
const multer = require('multer')
const auth = require('../middleware/auth')
const { uploadBufferToDrive, setFilePublic, downloadFileStream } = require('../services/driveService')
const { saveSummaryRecord, generateAndStoreSummary, generateDocumentHash, checkDuplicateDocument, quickDuplicateCheck, deleteSummaryRecord } = require('../services/summaryService')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/msword'
    ])
    if (allowed.has(file.mimetype)) return cb(null, true)
    cb(new Error('Only PDF and Word files are allowed'))
  }
})

// Pre-check upload endpoint to detect duplicates without storing
// Method: POST /upload-before-check (auth required)
// Form: multipart/form-data with field "file"
// Returns: { isDuplicate: boolean, existingId? }
router.post('/upload-before-check', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' })
    const { size, buffer } = req.file

    if (size > 10 * 1024 * 1024) {
      return res.status(413).json({ 
        message: 'File size exceeds 10MB limit. Large files may cause processing issues.',
        maxSize: '10MB',
        actualSize: `${(size / (1024 * 1024)).toFixed(2)}MB`
      })
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ message: 'File buffer is empty or corrupted' })
    }

    const { checkDuplicateDocument, generateDocumentHash } = require('../services/summaryService')
    const documentHash = generateDocumentHash(buffer)
    const existing = await checkDuplicateDocument(req.user.id, documentHash, size)
    if (existing) {
      return res.status(200).json({ isDuplicate: true, existingId: existing._id })
    }
    return res.status(200).json({ isDuplicate: false })
  } catch (err) {
    next(err)
  }
})

// Upload a file to Google Drive and create a summary record
// Method: POST /upload (auth required)
// Form: multipart/form-data with field "file"
// Returns: { id, driveFileId, webViewLink, webContentLink, summaryText }
router.post('/upload', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' })
    const { originalname, mimetype, size, buffer } = req.file

    if (size > 10 * 1024 * 1024) {
      return res.status(413).json({ 
        message: 'File size exceeds 10MB limit. Large files may cause processing issues.',
        maxSize: '10MB',
        actualSize: `${(size / (1024 * 1024)).toFixed(2)}MB`
      })
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ message: 'File buffer is empty or corrupted' })
    }

    const documentHash = generateDocumentHash(buffer)
    
    const existingSummary = await checkDuplicateDocument(req.user.id, documentHash, size)
    if (existingSummary) {
      return res.status(200).json({
        id: existingSummary._id,
        driveFileId: existingSummary.driveFileId,
        webViewLink: existingSummary.webViewLink,
        webContentLink: existingSummary.webContentLink,
        summaryText: existingSummary.summaryText,
        isDuplicate: true
      })
    }

    const parents = process.env.GDRIVE_FOLDER_ID ? [process.env.GDRIVE_FOLDER_ID] : undefined
    const uploaded = await uploadBufferToDrive({ buffer, filename: originalname, mimeType: mimetype, parents })
    let links = uploaded

    const makePublic = (process.env.DRIVE_PUBLIC_READ || 'true').toLowerCase() === 'true'
    if (makePublic) {
      try {
        links = await setFilePublic({ fileId: uploaded.id })
      } catch (permErr) {
        console.warn('Could not set public permission:', permErr && permErr.message ? permErr.message : permErr)
      }
    }

    const record = await saveSummaryRecord({
      userId: req.user.id,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      driveFileId: uploaded.id,
      webViewLink: links.webViewLink,
      webContentLink: links.webContentLink,
      documentHash: documentHash
    })

    try {
      const summaryResult = await generateAndStoreSummary({ summaryId: record._id })

      res.status(201).json({
        id: record._id,
        driveFileId: record.driveFileId,
        webViewLink: record.webViewLink,
        webContentLink: record.webContentLink,
        summaryText: summaryResult.summaryText,
        isDuplicate: false
      })
    } catch (summErr) {
      try {
        await deleteSummaryRecord({ summaryId: record._id, userId: req.user.id })
      } catch (_) {}
      throw summErr
    }
  } catch (err) {
    next(err)
  }
})


// List summary records for the current user
// Method: GET /me/summaries (auth required)
// Returns: { summaries: [...] }
router.get('/me/summaries', auth, async (req, res, next) => {
  try {
    const { listSummariesByUser } = require('../services/summaryService')
    const summaries = await listSummariesByUser(req.user.id)
    res.status(200).json({ summaries })
  } catch (err) {
    next(err)
  }
})

// Fetch a single summary record by id
// Method: GET /summaries/:id (auth required)
// Returns: { summary }
router.get('/summaries/:id', auth, async (req, res, next) => {
  try {
    const Summary = require('../models/Summary')
    const summary = await Summary.findById(req.params.id).lean()
    if (!summary) return res.status(404).json({ message: 'Not found' })
    const isOwner = String(summary.userId) === String(req.user.id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' })
    res.status(200).json({ summary })
  } catch (err) {
    next(err)
  }
})

// retrieve summary text for a specific record
// Method: POST /summaries/:id/summarize (auth required)
// Body: { model? } e.g., { model: 'llama-3.3-70b-versatile' }
// Returns: { id, summaryText, webViewLink }
router.post('/summaries/:id/summarize', auth, async (req, res, next) => {
  try {
    const id = req.params.id
    const Summary = require('../models/Summary')
    const existing = await Summary.findById(id)
    if (!existing) return res.status(404).json({ message: 'Not found' })
    const isOwner = String(existing.userId) === String(req.user.id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' })

    if (existing.summaryText) {
      return res.status(200).json({ id: existing._id, summaryText: existing.summaryText, webViewLink: existing.webViewLink })
    }

    const model = req.body && req.body.model ? req.body.model : undefined
    try {
      const result = await generateAndStoreSummary({ summaryId: id, model })
      return res.status(200).json(result)
    } catch (summErr) {
      try {
        await deleteSummaryRecord({ summaryId: id, userId: req.user.id })
      } catch (_) {}
      throw summErr
    }
  } catch (err) {
    next(err)
  }
})



// Stream the original file inline for viewing
// Method: POST /summaries/:id/view (auth required)
router.post('/summaries/:id/view', auth, async (req, res, next) => {
  try {
    const Summary = require('../models/Summary')
    const summary = await Summary.findById(req.params.id).lean()
    if (!summary) return res.status(404).json({ message: 'Not found' })
    const isOwner = String(summary.userId) === String(req.user.id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' })
    const { stream, name, mimeType, size } = await downloadFileStream({ fileId: summary.driveFileId })
    res.setHeader('Content-Type', mimeType || 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${name || 'file'}"`)
    if (size) res.setHeader('Content-Length', size)
    stream.on('error', (e) => next(e))
    stream.pipe(res)
  } catch (err) {
    next(err)
  }
})

// Test route to verify routing is working
router.get('/test-delete-route', auth, (req, res) => {
  res.json({ message: 'Delete route is accessible', userId: req.user.id });
});

// Delete a PDF document and its summary record
// Method: DELETE /summaries/:id (auth required)
// Returns: { success: true, message: string }
router.delete('/summaries/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('=== BACKEND DELETE REQUEST RECEIVED ===');
    console.log(`Delete request for summary ID: ${id}`);
    console.log(`ID type: ${typeof id}`);
    console.log(`ID length: ${id?.length}`);
    console.log(`ID value: "${id}"`);
    console.log(`User ID: ${req.user.id}`);
    console.log(`User ID type: ${typeof req.user.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`Request headers:`, req.headers);
    
    if (!id || id === 'undefined' || id === 'null') {
      console.error('❌ Invalid document ID provided');
      return res.status(400).json({ message: 'Invalid document ID' });
    }
    
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('❌ Invalid MongoDB ObjectId format');
      console.error(`ID "${id}" is not a valid ObjectId`);
      return res.status(400).json({ message: 'Invalid document ID format' });
    }
    
    console.log('✅ ID validation passed, proceeding with deletion...');
    
    const result = await deleteSummaryRecord({ 
      summaryId: id, 
      userId: req.user.id 
    })
    
    console.log('✅ Delete operation successful:', result);
    res.status(200).json(result)
  } catch (err) {
    console.error('❌ BACKEND DELETE OPERATION FAILED');
    console.error('Error object:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Error name:', err.name);
    
    if (err.message === 'Summary record not found') {
      console.error('❌ Summary record not found in database');
      return res.status(404).json({ message: 'Document not found' })
    }
    if (err.message.includes('Forbidden')) {
      console.error('❌ Access forbidden - user not owner');
      return res.status(403).json({ message: err.message })
    }
    console.error('❌ Unhandled error, passing to error handler');
    next(err)
  }
})

// Download the original file as attachment
// Method: GET /summaries/:id/download (auth required)
router.get('/summaries/:id/download', auth, async (req, res, next) => {
  try {
    const Summary = require('../models/Summary')
    const summary = await Summary.findById(req.params.id).lean()
    if (!summary) return res.status(404).json({ message: 'Not found' })
    const isOwner = String(summary.userId) === String(req.user.id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' })

    const { stream, name, mimeType, size } = await downloadFileStream({ fileId: summary.driveFileId })
    res.setHeader('Content-Type', mimeType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${name || 'file'}"`)
    if (size) res.setHeader('Content-Length', size)
    stream.on('error', (e) => next(e))
    stream.pipe(res)
  } catch (err) {
    next(err)
  }
})

module.exports = router
