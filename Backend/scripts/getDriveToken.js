const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../config/db');
const { saveTokenToDB } = require('../services/googleAuth');

const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Missing OAuth env. Ensure Backend/.env has OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET');
  process.exit(1);
}

const port = process.env.OAUTH_REDIRECT_PORT ? parseInt(process.env.OAUTH_REDIRECT_PORT, 10) : 53682;
const redirectUri = `http://localhost:${port}`;
const oauth2 = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
const scope = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.send'
];
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
    
    console.log('\n=== OAuth Tokens Received ===');
    console.log('ACCESS_TOKEN=' + (tokens.access_token || ''));
    console.log('REFRESH_TOKEN=' + (tokens.refresh_token || ''));
    
    if (process.env.MONGODB_URI) {
      try {
        await connectToDatabase();
        await saveTokenToDB(tokens);
        console.log('\n✅ Tokens saved to MongoDB successfully!');
        console.log('You can now remove OAUTH_REFRESH_TOKEN from .env file (optional).');
      } catch (dbError) {
        console.error('\n⚠️  Failed to save tokens to MongoDB:', dbError.message);
        console.log('Tokens are still available above. You can manually add REFRESH_TOKEN to .env');
      }
    } else {
      console.log('\n⚠️  MONGODB_URI not set. Tokens not saved to database.');
      console.log('Add REFRESH_TOKEN to your .env file manually.');
    }
    
    res.end('Authorization complete. Tokens saved to MongoDB. You can close this window.');
  } catch (e) {
    res.statusCode = 500;
    res.end('Token exchange failed');
    console.error('Error:', e.message);
  } finally {
    server.close(async () => {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
      process.exit(0);
    });
  }
});

server.listen(port, () => {
  console.log('\n=== Google OAuth Token Setup ===\n');
  console.log('Open this URL in your browser:');
  console.log(authUrl);
  console.log('\nWaiting for authorization...\n');
});


