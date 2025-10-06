const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const {apiLimiter } = require('./middleware/rateLimiters');
const { connectToDatabase } = require('./config/db');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/summaries'));

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



