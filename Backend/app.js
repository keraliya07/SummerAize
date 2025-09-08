const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { loginLimiter, apiLimiter } = require('./middleware/rateLimiters');
const { connectToDatabase } = require('./config/db');
const cookieParser = require('cookie-parser');
const validate = require('./middleware/validate');
const { signupValidator, loginValidator } = require('./validators/userValidators');
const { addUser } = require('./services/userService');
const { login } = require('./services/authService');
const multer = require('multer');
const authOptional = require('./middleware/authOptional');
const auth = require('./middleware/auth');
const { uploadBufferToDrive, setFilePublic, downloadFileStream } = require('./services/driveService');
const { saveSummaryRecord } = require('./services/summaryService');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/msword'
    ]);
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, word files are allowed'));
  }
});

app.post('/upload', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    const { originalname, mimetype, size, buffer } = req.file;
    
    console.log('Upload attempt:', { filename: originalname, size, mimetype });
    
    const parents = process.env.GDRIVE_FOLDER_ID ? [process.env.GDRIVE_FOLDER_ID] : undefined;
    console.log('Drive folder ID:', process.env.GDRIVE_FOLDER_ID ? 'set' : 'not set');
    
    const uploaded = await uploadBufferToDrive({ buffer, filename: originalname, mimeType: mimetype, parents });
    console.log('Drive upload success:', uploaded.id);
    let links = uploaded;

    const makePublic = (process.env.DRIVE_PUBLIC_READ || 'true').toLowerCase() === 'true';
    if (makePublic) {
      try {
        links = await setFilePublic({ fileId: uploaded.id });
      } catch (permErr) {
        console.warn('Could not set public permission:', permErr && permErr.message ? permErr.message : permErr);
      }
    }
    
    const record = await saveSummaryRecord({
      userId: req.user.id,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      driveFileId: uploaded.id,
      webViewLink: links.webViewLink,
      webContentLink: links.webContentLink
    });
    console.log('Database save success:', record._id);
    
    res.status(201).json({ id: record._id, driveFileId: record.driveFileId, webViewLink: record.webViewLink, webContentLink: record.webContentLink });
  } catch (err) {
    console.error('Upload error:', err.message, err.stack);
    next(err);
  }
});

app.get('/me/summaries', auth, async (req, res, next) => {
  try {
    const { listSummariesByUser } = require('./services/summaryService');
    const summaries = await listSummariesByUser(req.user.id);
    res.status(200).json({ summaries });
  } catch (err) {
    next(err);
  }
});


app.get('/summaries/:id/download', auth, async (req, res, next) => {
  try {
    const Summary = require('./models/Summary');
    const summary = await Summary.findById(req.params.id).lean();
    if (!summary) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(summary.userId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    const { stream, name, mimeType, size } = await downloadFileStream({ fileId: summary.driveFileId });
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${name || 'file'}"`);
    if (size) res.setHeader('Content-Length', size);
    stream.on('error', (e) => next(e));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

app.post('/summaries/:id/view', auth, async (req, res, next) => {
  try {
    const Summary = require('./models/Summary');
    const summary = await Summary.findById(req.params.id).lean();
    if (!summary) return res.status(404).json({ message: 'Not found' });
    const isOwner = String(summary.userId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });
    const { stream, name, mimeType, size } = await downloadFileStream({ fileId: summary.driveFileId });
    res.setHeader('Content-Type', mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${name || 'file'}"`);
    if (size) res.setHeader('Content-Length', size);
    stream.on('error', (e) => next(e));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

app.post('/signup', signupValidator, validate, async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const user = await addUser({ username, email, password, role });
    const safe = { id: user._id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt };
    res.status(201).json({ user: safe });
  } catch (err) {
    next(err);
  }
});

app.post('/login', loginLimiter, loginValidator, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await login({ email, password });
    res.status(200).json({ user: { id: result.user._id, username: result.user.username, email: result.user.email, role: result.user.role }, token: result.token });
  } catch (err) {
    next(err);
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


const { notFound, errorHandler } = require('./middleware/error');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectToDatabase()
  .then(() => {
    console.log('Database connected');
    app.listen(PORT, () => {
      const baseUrl = process.env.WEBSITE_URL || process.env.BASE_URL || `http://localhost:${PORT}`;
      const env = process.env.NODE_ENV || 'development';
      console.log(`Server running at: ${baseUrl}`);
      console.log(`Environment: ${env}`);
    });
  })
  .catch((err) => {
    console.error('Startup error', { message: err && err.message ? err.message : String(err) });
    process.exit(1);
  });

module.exports = app;


