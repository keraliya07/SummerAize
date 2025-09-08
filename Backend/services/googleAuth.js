const { google } = require('googleapis');

function createOAuth2Client() {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  const oauth2 = new google.auth.OAuth2({ clientId, clientSecret });
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function createServiceAccountClient() {
  const clientEmail = process.env.GDRIVE_CLIENT_EMAIL;
  const privateKey = (process.env.GDRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const scopes = ['https://www.googleapis.com/auth/drive'];
  if (!clientEmail || !privateKey) {
    return null;
  }
  return new google.auth.JWT(clientEmail, undefined, privateKey, scopes);
}

function getDriveAuth() {
  const preferred = (process.env.DRIVE_AUTH_MODE || '').toLowerCase();
  if (preferred === 'oauth') {
    const oauth = createOAuth2Client();
    if (oauth) return oauth;
  }
  if (preferred === 'service' || !preferred) {
    const jwt = createServiceAccountClient();
    if (jwt) return jwt;
  }
  const oauthFallback = createOAuth2Client();
  if (oauthFallback) return oauthFallback;
  const jwtFallback = createServiceAccountClient();
  if (jwtFallback) return jwtFallback;
  throw new Error('Missing Google auth credentials');
}

module.exports = { getDriveAuth };


