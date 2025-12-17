function getFrontendUrl() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.WEBSITE_URL && !process.env.FRONTEND_URL) {
      throw new Error('WEBSITE_URL or FRONTEND_URL must be set in production');
    }
    return process.env.WEBSITE_URL || process.env.FRONTEND_URL;
  }
  return process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
}

function getBackendUrl() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BACKEND_URL && !process.env.BASE_URL) {
      throw new Error('BACKEND_URL or BASE_URL must be set in production');
    }
    return process.env.BACKEND_URL || process.env.BASE_URL;
  }
  const port = process.env.PORT || 5000;
  return process.env.BACKEND_URL || process.env.BASE_URL || `http://localhost:${port}`;
}

module.exports = { getFrontendUrl, getBackendUrl };

