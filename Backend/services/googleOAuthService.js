const { google } = require('googleapis');
const User = require('../models/User');

function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
  
  // Use PORT from environment or default to 5000
  const port = process.env.PORT || 5000;
  const backendUrl = process.env.BACKEND_URL || process.env.BASE_URL || `http://localhost:${port}`;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${backendUrl}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
  }

  console.log('\n=== Google OAuth Configuration ===');
  console.log('Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'MISSING');
  console.log('Redirect URI:', redirectUri);
  console.log('⚠️  IMPORTANT: Make sure this EXACT redirect URI is added in Google Cloud Console!');
  console.log('===================================\n');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getAuthUrl() {
  try {
    const oauth2Client = createGoogleOAuthClient();
    
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });

    if (!authUrl) {
      throw new Error('Failed to generate Google OAuth URL')
    }

    return authUrl;
  } catch (error) {
    console.error('Error in getAuthUrl:', error.message || error);
    throw error;
  }
}

async function getUserInfo(code) {
  if (!code) {
    throw new Error('Authorization code is required');
  }

  try {
    const oauth2Client = createGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens || !tokens.access_token) {
      throw new Error('Failed to obtain access token from Google');
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });

    const { data } = await oauth2.userinfo.get();
    
    if (!data || !data.email) {
      throw new Error('Failed to retrieve user information from Google');
    }
    
    return {
      googleId: data.id,
      email: data.email,
      username: data.name || data.email.split('@')[0],
      profilePicture: data.picture || null
    };
  } catch (error) {
    console.error('Error getting user info from Google:', error.message || error);
    if (error.message && error.message.includes('Failed to')) {
      throw error;
    }
    throw new Error('Failed to authenticate with Google: ' + (error.message || String(error)));
  }
}

async function generateUniqueUsername(baseUsername) {
  let username = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
  let counter = 1;
  let finalUsername = username;

  while (await User.findOne({ username: finalUsername })) {
    finalUsername = `${username}${counter}`;
    counter++;
  }

  return finalUsername;
}

async function findOrCreateGoogleUser(userInfo) {
  try {
    let user = await User.findOne({ 
      $or: [
        { googleId: userInfo.googleId },
        { email: userInfo.email }
      ]
    });

    if (!user) {
      const existingEmail = await User.findOne({ email: userInfo.email });
      if (existingEmail) {
        existingEmail.googleId = userInfo.googleId;
        existingEmail.profilePicture = userInfo.profilePicture || existingEmail.profilePicture;
        await existingEmail.save();
        return existingEmail;
      }

      const uniqueUsername = await generateUniqueUsername(userInfo.username);
      
      user = await User.create({
        username: uniqueUsername,
        email: userInfo.email,
        googleId: userInfo.googleId,
        profilePicture: userInfo.profilePicture,
        passwordHash: null
      });
    } else if (!user.googleId) {
      user.googleId = userInfo.googleId;
      user.profilePicture = userInfo.profilePicture || user.profilePicture;
      await user.save();
    }

    return user;
  } catch (error) {
    console.error('Error finding/creating Google user:', error.message);
    if (error.code === 11000) {
      if (error.keyPattern?.username) {
        const uniqueUsername = await generateUniqueUsername(userInfo.username);
        user = await User.create({
          username: uniqueUsername,
          email: userInfo.email,
          googleId: userInfo.googleId,
          profilePicture: userInfo.profilePicture,
          passwordHash: null
        });
        return user;
      }
    }
    throw new Error('Failed to create or find user account');
  }
}

module.exports = { getAuthUrl, getUserInfo, findOrCreateGoogleUser };

