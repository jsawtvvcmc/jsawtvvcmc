"""
Google Drive Service for J-APP
Uses Service Account for server-to-server authentication
"""
import os
import io
import base64
import json
import logging
from typing import Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

logger = logging.getLogger(__name__)

# Scopes required for Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive']

class GoogleDriveService:
    def __init__(self):
        self.service = None
        self.folder_id = os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Drive service using Service Account credentials"""
        try:
            # Get credentials from environment variable (JSON string)
            creds_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
            
            if not creds_json:
                logger.warning("GOOGLE_SERVICE_ACCOUNT_JSON not set - Google Drive disabled")
                return
            
            # Parse the JSON credentials
            creds_info = json.loads(creds_json)
            
            # Create credentials from service account info
            credentials = service_account.Credentials.from_service_account_info(
                creds_info,
                scopes=SCOPES
            )
            
            # Build the Drive service
            self.service = build('drive', 'v3', credentials=credentials)
            logger.info("Google Drive service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Drive: {str(e)}")
            self.service = None
    
    def is_connected(self) -> bool:
        """Check if Google Drive service is available"""
        return self.service is not None
    
    def test_connection(self) -> dict:
        """Test the Google Drive connection"""
        if not self.service:
            return {"connected": False, "error": "Service not initialized"}
        
        try:
            # Try to get info about the service account's drive
            about = self.service.about().get(fields="user").execute()
            return {
                "connected": True,
                "user": about.get('user', {}).get('emailAddress', 'Unknown'),
                "folder_id": self.folder_id
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}
    
    def upload_image(self, base64_data: str, filename: str, case_number: str = None) -> Optional[dict]:
        """
        Upload a base64 encoded image to Google Drive
        
        Args:
            base64_data: Base64 encoded image data (with or without data URL prefix)
            filename: Name for the file
            case_number: Optional case number for organizing files
            
        Returns:
            dict with file_id and web_view_link, or None on failure
        """
        if not self.service:
            logger.warning("Google Drive not connected - skipping upload")
            return None
        
        try:
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_data)
            
            # Determine MIME type from filename or default to JPEG
            mime_type = 'image/jpeg'
            if filename.lower().endswith('.png'):
                mime_type = 'image/png'
            elif filename.lower().endswith('.gif'):
                mime_type = 'image/gif'
            elif filename.lower().endswith('.webp'):
                mime_type = 'image/webp'
            
            # Create file metadata
            file_metadata = {
                'name': filename,
                'description': f'J-APP Case: {case_number}' if case_number else 'J-APP Image'
            }
            
            # Add to specific folder if configured
            if self.folder_id:
                file_metadata['parents'] = [self.folder_id]
            
            # Create media upload
            media = MediaIoBaseUpload(
                io.BytesIO(image_bytes),
                mimetype=mime_type,
                resumable=True
            )
            
            # Upload file
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, webViewLink, webContentLink'
            ).execute()
            
            # Make file publicly viewable
            self.service.permissions().create(
                fileId=file['id'],
                body={'type': 'anyone', 'role': 'reader'}
            ).execute()
            
            # Get updated file info with sharing link
            file = self.service.files().get(
                fileId=file['id'],
                fields='id, name, webViewLink, webContentLink'
            ).execute()
            
            logger.info(f"Uploaded image to Google Drive: {file['id']}")
            
            return {
                'file_id': file['id'],
                'filename': file['name'],
                'web_view_link': file.get('webViewLink'),
                'web_content_link': file.get('webContentLink'),
                'direct_link': f"https://drive.google.com/uc?id={file['id']}"
            }
            
        except Exception as e:
            logger.error(f"Failed to upload image to Google Drive: {str(e)}")
            return None
    
    def delete_file(self, file_id: str) -> bool:
        """Delete a file from Google Drive"""
        if not self.service:
            return False
        
        try:
            self.service.files().delete(fileId=file_id).execute()
            logger.info(f"Deleted file from Google Drive: {file_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {str(e)}")
            return False
    
    def list_files(self, page_size: int = 100) -> list:
        """List files in the configured folder"""
        if not self.service:
            return []
        
        try:
            query = f"'{self.folder_id}' in parents" if self.folder_id else None
            
            results = self.service.files().list(
                pageSize=page_size,
                q=query,
                fields="files(id, name, mimeType, createdTime, webViewLink)"
            ).execute()
            
            return results.get('files', [])
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []


# Singleton instance
_drive_service = None

def get_drive_service() -> GoogleDriveService:
    """Get the singleton Google Drive service instance"""
    global _drive_service
    if _drive_service is None:
        _drive_service = GoogleDriveService()
    return _drive_service
