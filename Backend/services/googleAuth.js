const { google } = require('googleapis');

function createOAuth2Client() {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth credentials: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, and OAUTH_REFRESH_TOKEN are required');
  }
  const oauth2 = new google.auth.OAuth2({ clientId, clientSecret });
  oauth2.setCredentials({ refresh_token: refreshToken }); 
  // it generates the access token automatically when access token is expired
  return oauth2;
}

function getDriveAuth() {
  return createOAuth2Client();
}

module.exports = { getDriveAuth };


