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
    app.listen(PORT, () => {
      const baseUrl = process.env.WEBSITE_URL || process.env.BASE_URL || `http://localhost:${PORT}`;
      const env = process.env.NODE_ENV || 'development';
      console.log(`\n✅ Server running at: ${baseUrl}`);
      console.log(`📦 Environment: ${env}`);
      console.log(`🚀 Server ready to accept connections\n`);
    });
  })
  .catch((err) => {
    console.error('\n❌ Startup error:', err.message || String(err));
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check if MONGODB_URI is set in your .env file');
    console.error('   2. Verify your MongoDB connection string is correct');
    console.error('   3. Check your internet connection');
    console.error('   4. If using MongoDB Atlas, verify the cluster is running\n');
    process.exit(1);
  });

module.exports = app;



