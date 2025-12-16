# Google OAuth Setup Guide

## Fix "Error 400: redirect_uri_mismatch"

This error occurs when the redirect URI in your code doesn't exactly match what's configured in Google Cloud Console.

## Step-by-Step Fix

### 1. Check Your Backend Console Logs

When you start your backend server and try to login, check the console output. You should see:

```
=== Google OAuth Configuration ===
Client ID: [your-client-id]...
Redirect URI: http://localhost:5000/auth/google/callback
⚠️  IMPORTANT: Make sure this EXACT redirect URI is added in Google Cloud Console!
===================================
```

**Copy the exact Redirect URI shown in the console.**

### 2. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID (or create a new one)
5. Under **Authorized redirect URIs**, click **+ ADD URI**
6. Paste the EXACT redirect URI from step 1:
   ```
   http://localhost:5000/auth/google/callback
   ```
   **⚠️ IMPORTANT:**
   - Must match EXACTLY (case-sensitive, including `http://` not `https://`)
   - No trailing slashes
   - Include the port number if using localhost
   - If your backend runs on a different port, use that port

7. Click **SAVE**

### 3. Wait for Changes to Propagate

After saving, wait 1-2 minutes for Google's servers to update. Then try logging in again.

### 4. Environment Variables

Make sure your `.env` file has:

```env
# For user authentication (separate from Drive API)
GOOGLE_CLIENT_ID=your-oauth-client-id-here
GOOGLE_CLIENT_SECRET=your-oauth-client-secret-here

# Optional - only if different from default
BACKEND_URL=http://localhost:5000
PORT=5000
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
```

### 5. Common Issues

**Issue: Still getting redirect_uri_mismatch after adding URI**

- Double-check the URI matches EXACTLY (copy from backend console logs)
- Make sure you're using the correct OAuth Client ID (not the Drive API one)
- Wait a few minutes for changes to propagate
- Try in an incognito/private browser window

**Issue: Backend runs on different port**

If your backend runs on port 3000, 8000, or any other port:
- Update the redirect URI in Google Console to match
- Or set `BACKEND_URL` or `GOOGLE_REDIRECT_URI` in `.env`

**Issue: Using production URL**

If deploying, you'll need:
- Add both `http://localhost:5000/auth/google/callback` (for local dev)
- AND `https://yourdomain.com/auth/google/callback` (for production)
- Update `.env` with `BACKEND_URL=https://yourdomain.com`

### 6. Verify Setup

After configuration, the redirect URI in your backend logs should match exactly what's in Google Cloud Console.




