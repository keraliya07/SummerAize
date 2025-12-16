const { google } = require('googleapis');
const OAuthToken = require('../models/OAuthToken');

let tokenCache = null;
let lastCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getStoredToken() {
  if (tokenCache && lastCacheTime && (Date.now() - lastCacheTime) < CACHE_TTL) {
    return tokenCache;
  }

  try {
    const token = await OAuthToken.findOne({ service: 'google-drive' });
    if (token) {
      tokenCache = token;
      lastCacheTime = Date.now();
      return token;
    }
  } catch (error) {
    console.error('Error fetching token from MongoDB:', error.message);
  }
  
  return null;
}

async function saveTokenToDB(tokenData) {
  try {
    const token = await OAuthToken.findOneAndUpdate(
      { service: 'google-drive' },
      {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || tokenCache?.refreshToken,
        tokenType: tokenData.token_type || 'Bearer',
        expiryDate: tokenData.expiry_date ? new Date(tokenData.expiry_date) : null,
        scope: tokenData.scope,
        lastRefreshed: new Date(),
        $inc: { refreshCount: 1 }
      },
      { upsert: true, new: true }
    );
    tokenCache = token;
    lastCacheTime = Date.now();
    return token;
  } catch (error) {
    console.error('Error saving token to MongoDB:', error.message);
    throw error;
  }
}

async function createOAuth2Client() {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing OAuth credentials: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET are required');
  }

  let refreshToken = process.env.OAUTH_REFRESH_TOKEN;
  const storedToken = await getStoredToken();
  
  if (storedToken && storedToken.refreshToken) {
    refreshToken = storedToken.refreshToken;
    console.log('Using refresh token from MongoDB');
  } else if (!refreshToken) {
    throw new Error('No refresh token found. Please run: npm run get-drive-token');
  } else {
    console.log('Using refresh token from environment variables');
    if (storedToken === null) {
      await saveTokenToDB({ refresh_token: refreshToken });
    }
  }

  const oauth2 = new google.auth.OAuth2({ clientId, clientSecret });
  
  oauth2.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await saveTokenToDB(tokens);
      console.log('Token refreshed and saved to MongoDB');
    } else if (tokens.access_token) {
      const currentToken = await getStoredToken();
      if (currentToken) {
        await OAuthToken.findOneAndUpdate(
          { service: 'google-drive' },
          {
            accessToken: tokens.access_token,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            lastRefreshed: new Date(),
            $inc: { refreshCount: 1 }
          }
        );
        tokenCache = null;
      }
    }
  });

  if (storedToken && storedToken.accessToken && storedToken.expiryDate) {
    const expiresAt = new Date(storedToken.expiryDate);
    const now = new Date();
    if (expiresAt > now) {
      oauth2.setCredentials({
        access_token: storedToken.accessToken,
        refresh_token: refreshToken,
        expiry_date: storedToken.expiryDate.getTime()
      });
      console.log('Using cached access token from MongoDB');
      return oauth2;
    }
  }

  oauth2.setCredentials({ refresh_token: refreshToken });
  
  try {
    const { token } = await oauth2.getAccessToken();
    if (token) {
      console.log('Successfully obtained new access token');
    }
  } catch (error) {
    if (error.message && error.message.includes('invalid_grant')) {
      console.error('Refresh token expired or invalid. You need to re-authorize:');
      console.error('Run: npm run get-drive-token');
      throw new Error('Refresh token expired. Please re-run the token setup script.');
    }
    throw error;
  }

  return oauth2;
}

async function getDriveAuth() {
  return await createOAuth2Client();
}

async function checkTokenHealth() {
  try {
    const token = await getStoredToken();
    if (!token) {
      return { healthy: false, message: 'No token found in database' };
    }
    
    const oauth2 = await createOAuth2Client();
    await oauth2.getAccessToken();
    
    return { 
      healthy: true, 
      lastRefreshed: token.lastRefreshed,
      refreshCount: token.refreshCount
    };
  } catch (error) {
    return { 
      healthy: false, 
      message: error.message,
      needsReauth: error.message.includes('invalid_grant') || error.message.includes('Refresh token expired')
    };
  }
}

module.exports = { getDriveAuth, checkTokenHealth, saveTokenToDB };


