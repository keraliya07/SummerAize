//  This file is used to get the drive token for the user


const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const { google } = require('googleapis');

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Missing OAuth env. Ensure Backend/.env has OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET');
  process.exit(1);
}

const port = process.env.OAUTH_REDIRECT_PORT ? parseInt(process.env.OAUTH_REDIRECT_PORT, 10) : 53682;
const redirectUri = `http://localhost:${port}`;
const oauth2 = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
const scope = ['https://www.googleapis.com/auth/drive'];
const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}` || 'http://localhost:53682');
  const code = url.searchParams.get('code');
  if (!code) {
    res.statusCode = 400;
    res.end('Missing code');
    return;
  }
  try {
    const { tokens } = await oauth2.getToken(code);
    console.log('ACCESS_TOKEN=' + (tokens.access_token || ''));
    console.log('REFRESH_TOKEN=' + (tokens.refresh_token || ''));
    res.end('Authorization complete. You can close this window.');
  } catch (e) {
    res.statusCode = 500;
    res.end('Token exchange failed');
    console.error(e.message);
  } finally {
    server.close(() => process.exit(0));
  }
});

server.listen(port, () => {
  console.log('Open this URL in your browser:');
  console.log(authUrl);
});


