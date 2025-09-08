const { google } = require('googleapis');
const { getDriveAuth } = require('./googleAuth');

function createDriveClient() {
  const auth = getDriveAuth();
  return google.drive({ version: 'v3', auth });
}

function validateFolderId(folderId) {
  if (!folderId || typeof folderId !== 'string') {
    return false;
  }
  
  const googleDriveIdPattern = /^[a-zA-Z0-9_-]{20,}$/;
  return googleDriveIdPattern.test(folderId);
}

async function uploadBufferToDrive(params) {
  const { buffer, filename, mimeType, parents } = params;
  
  console.log('Drive upload params:', { 
    filename, 
    mimeType, 
    bufferSize: buffer.length, 
    parents: parents || 'none' 
  });
  
  const drive = createDriveClient();
  const fileMetadata = { name: filename };
  
  if (parents && parents.length) {
    const folderId = parents[0];
    
    if (!validateFolderId(folderId)) {
      throw new Error(`Invalid Google Drive folder ID format: ${folderId}. Folder ID must be a valid Google Drive ID (20+ characters, alphanumeric with hyphens/underscores)`);
    }
    
    console.log('Checking folder access for:', folderId);
    try {
      const folderInfo = await drive.files.get({ 
        fileId: folderId,
        fields: 'id,name,mimeType,permissions',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      console.log('Folder access confirmed:', {
        id: folderInfo.data.id,
        name: folderInfo.data.name,
        mimeType: folderInfo.data.mimeType,
        permissions: folderInfo.data.permissions?.length || 0
      });
      fileMetadata.parents = parents;
    } catch (folderError) {
      console.error('Folder access failed:', {
        error: folderError.message,
        code: folderError.code,
        status: folderError.status,
        folderId: folderId
      });

      const isOAuth = (process.env.DRIVE_AUTH_MODE || '').toLowerCase() === 'oauth';
      if (isOAuth && (folderError.code === 403 || folderError.code === 404)) {
        console.log('Proceeding without folder pre-check under OAuth (likely drive.file scope).');
        fileMetadata.parents = parents;
      } else if (folderError.code === 404) {
        throw new Error(`Google Drive folder not found: ${folderId}. Please verify the folder ID exists and access is granted.`);
      } else if (folderError.code === 403) {
        throw new Error(`Access denied to Google Drive folder: ${folderId}. Please ensure the account in use has permissions.`);
      } else {
        throw new Error(`Google Drive folder access error: ${folderError.message}. Folder ID: ${folderId}`);
      }
    }
  } else {
    throw new Error('GDRIVE_FOLDER_ID is required but not provided');
  }
  
  console.log('File metadata:', fileMetadata);
  
  const { Readable } = require('stream');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  
  const media = { 
    mimeType, 
    body: stream
  };
  
  console.log('Media config:', { mimeType, bodyType: typeof stream });
  
  try {
    const res = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true
    });
    console.log('Drive API response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Drive API error:', error.message);
    console.error('Drive API error details:', error);
    const isOAuth = (process.env.DRIVE_AUTH_MODE || '').toLowerCase() === 'oauth';
    const insufficientParent =
      (error.code === 403 || error.status === 403) &&
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('insufficient permissions for the specified parent');
    if (isOAuth && insufficientParent && fileMetadata.parents) {
      console.log('Retrying upload without parent under OAuth (fallback to My Drive root).');
      const retryMetadata = { ...fileMetadata };
      delete retryMetadata.parents;
      try {
        const retryRes = await drive.files.create({
          requestBody: retryMetadata,
          media,
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true
        });
        console.log('Retry upload successful:', retryRes.data);
        return retryRes.data;
      } catch (retryError) {
        console.error('Retry without parent failed:', retryError.message);
        throw retryError;
      }
    }
    throw error;
  }
}

module.exports = { uploadBufferToDrive };

