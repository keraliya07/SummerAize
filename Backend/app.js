const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { loginLimiter, apiLimiter } = require('./middleware/rateLimiters');
const { connectToDatabase } = require('./config/db');
const cookieParser = require('cookie-parser');
const { runStartupChecks } = require('./utils/startupCheck');
const validate = require('./middleware/validate');
const { signupValidator, loginValidator } = require('./validators/userValidators');
const { addUser } = require('./services/userService');
const { login } = require('./services/authService');
const multer = require('multer');
const authOptional = require('./middleware/authOptional');
const { uploadBufferToDrive } = require('./services/driveService');
const { saveSummaryRecord } = require('./services/summaryService');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } });

app.post('/upload', authOptional, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    const { originalname, mimetype, size, buffer } = req.file;
    
    console.log('Upload attempt:', { filename: originalname, size, mimetype });
    
    const parents = process.env.GDRIVE_FOLDER_ID ? [process.env.GDRIVE_FOLDER_ID] : undefined;
    console.log('Drive folder ID:', process.env.GDRIVE_FOLDER_ID ? 'set' : 'not set');
    
    const uploaded = await uploadBufferToDrive({ buffer, filename: originalname, mimeType: mimetype, parents });
    console.log('Drive upload success:', uploaded.id);
    
    const record = await saveSummaryRecord({
      userId: req.user && req.user.id ? req.user.id : undefined,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      driveFileId: uploaded.id,
      webViewLink: uploaded.webViewLink,
      webContentLink: uploaded.webContentLink
    });
    console.log('Database save success:', record._id);
    
    res.status(201).json({ id: record._id, driveFileId: record.driveFileId, webViewLink: record.webViewLink, webContentLink: record.webContentLink });
  } catch (err) {
    console.error('Upload error:', err.message, err.stack);
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
    app.listen(PORT, () => {
      runStartupChecks(app);
    });
  })
  .catch((err) => {
    console.error('Startup error', { message: err && err.message ? err.message : String(err) });
    process.exit(1);
  });

module.exports = app;


