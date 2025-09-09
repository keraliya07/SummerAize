## SummerAize Backend

Node.js/Express backend for document upload to Google Drive, extraction, and summarization using Groq API. Includes JWT auth, MongoDB persistence, rate limiting, and file streaming.

### Requirements
- Node.js 18+
- MongoDB database (Atlas)
- Google Cloud credentials for Drive API
- Groq API key for text summarization
- Email service (Gmail recommended)

### Getting Started
1. Clone and open the backend directory.
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file (see Environment Variables).
4. Start the server:
```bash
# Development with reload
npm run dev

# Production
npm start
```

### Scripts
- `npm run dev`: Start with nodemon
- `npm start`: Start server
- `npm run get-drive-token`: Helper to obtain OAuth refresh token

### Environment Variables
Mandatory:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for signing JWTs
- `GROQ_API_KEY`: Groq API key for text summarization
- `EMAIL_USER`: Email address for sending verification emails
- `EMAIL_PASSWORD`: Email password or app-specific password
- `GDRIVE_FOLDER_ID`: Google Drive folder ID to store uploads
- `OAUTH_CLIENT_ID`: OAuth client ID
- `OAUTH_CLIENT_SECRET`: OAuth client secret
- `OAUTH_REFRESH_TOKEN`: OAuth refresh token

Optional:
- `PORT`: Server port (default 5000)
- `BASE_URL`: Base URL for email verification links (e.g., https://yourdomain.com)
- `DRIVE_PUBLIC_READ`: `true|false` to make files world-readable after upload (default true)
- `NODE_ENV`: `development|production`

### Project Structure
```text
app.js
config/
  db.js
middleware/
  auth.js, authOptional.js, error.js, rateLimiters.js, validate.js
models/
  User.js, Summary.js
services/
  authService.js, driveService.js, googleAuth.js,
  textExtractService.js, textSummarizeService.js, summaryService.js
utils/
  AppError.js, jwt.js
validators/
  userValidators.js
scripts/
  getDriveToken.js
```

### API Overview
Base URL: `http://localhost:5000`

Auth
- POST `/signup` → Create user (sends welcome email)
- POST `/login` → Login and receive JWT

Health
- GET `/health` → Service status

Summaries & Files (JWT required)
- POST `/upload-before-check` → Check if document is duplicate before uploading
- POST `/upload` → Upload a file to Drive and create a summary record (checks for duplicates)
- GET `/me/summaries` → List current user's summary records
- POST `/summaries/:id/summarize` → Generate and save summary text via Groq
- POST `/summaries/:id/view` → Stream the original file inline
- GET `/summaries/:id/download` → Download the original file

### Auth
Use the `Authorization: Bearer <token>` header for protected endpoints. Obtain the token from `/login`.

### Example Requests
Signup:
```bash
curl -X POST http://localhost:5000/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"Passw0rd!"}'
```

Login:
```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Passw0rd!"}'
```

Check for duplicate document:
```bash
curl -X POST http://localhost:5000/upload-before-check \
  -H "Authorization: Bearer <TOKEN>" \
  -F file=@/path/to/file.pdf
```

Upload (PDF or DOC/DOCX up to 10MB):
```bash
curl -X POST http://localhost:5000/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F file=@/path/to/file.pdf
```

List my summaries:
```bash
curl -X GET http://localhost:5000/me/summaries \
  -H "Authorization: Bearer <TOKEN>"
```

Summarize a file:
```bash
curl -X POST http://localhost:5000/summaries/<SUMMARY_ID>/summarize \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b-versatile"}'
```

View inline:
```bash
curl -X POST http://localhost:5000/summaries/<SUMMARY_ID>/view \
  -H "Authorization: Bearer <TOKEN>" -L -o -
```

Download:
```bash
curl -L -X GET http://localhost:5000/summaries/<SUMMARY_ID>/download \
  -H "Authorization: Bearer <TOKEN>" -o file
```

### Upload Constraints
- Max size: 10 MB
- Allowed MIME types: `application/pdf`, `application/msword`

### Notes on Google Drive Setup
- Ensure the specified `GDRIVE_FOLDER_ID` exists and the OAuth client account has access to that folder.
- Scopes must allow Drive file operations; the helper script can aid in obtaining a refresh token.

### Error Handling
- Standardized JSON errors with proper HTTP status codes
- Rate limiting enabled for general API and login attempts

### License
ISC
