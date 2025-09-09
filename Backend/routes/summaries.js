const express = require('express')
const multer = require('multer')
const auth = require('../middleware/auth')
const { uploadBufferToDrive, setFilePublic, downloadFileStream } = require('../services/driveService')
const { saveSummaryRecord, generateAndStoreSummary, generateDocumentHash, checkDuplicateDocument, quickDuplicateCheck } = require('../services/summaryService')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/msword'
    ])
    if (allowed.has(file.mimetype)) return cb(null, true)
    cb(new Error('Only PDF, word files are allowed'))
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

    const summaryResult = await generateAndStoreSummary({ summaryId: record._id })

    res.status(201).json({
      id: record._id,
      driveFileId: record.driveFileId,
      webViewLink: record.webViewLink,
      webContentLink: record.webContentLink,
      summaryText: summaryResult.summaryText,
      isDuplicate: false
    })
  } catch (err) {
    next(err)
  }
})

// Check if document is duplicate before uploading
// Method: POST /upload-before-check (auth required)
// Form: multipart/form-data with field "file"
// Returns: { isDuplicate: boolean, existingSummary?: {...}, newUpload?: {...} }
router.post('/upload-before-check', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' })
    
    const { buffer, size } = req.file
    
    // Quick check by file size first (faster)
    const hasSameSize = await quickDuplicateCheck(req.user.id, size)
    if (!hasSameSize) {
      return res.status(200).json({
        isDuplicate: false,
        reason: 'No files with same size found'
      })
    }
    
    // If same size exists, do full hash check
    const documentHash = generateDocumentHash(buffer)
    const existingSummary = await checkDuplicateDocument(req.user.id, documentHash, size)
    
    if (existingSummary) {
      return res.status(200).json({
        isDuplicate: true,
        existingSummary: {
          id: existingSummary._id,
          originalName: existingSummary.originalName,
          summaryText: existingSummary.summaryText,
          webViewLink: existingSummary.webViewLink,
          createdAt: existingSummary.createdAt
        }
      })
    }
    
    res.status(200).json({
      isDuplicate: false,
      documentHash: documentHash,
      reason: 'Same size but different content'
    })
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
    const result = await generateAndStoreSummary({ summaryId: id, model })
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

// Download the original file from Google Drive
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
    res.setHeader('Content-Disposition', `inline; filename="${name || 'file'}"`)
    if (size) res.setHeader('Content-Length', size)
    stream.on('error', (e) => next(e))
    stream.pipe(res)
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

module.exports = router
