"""
Google Drive OAuth Service for J-APP
Uses OAuth 2.0 for user-based authentication
"""
import os
import io
import base64
import logging
from typing import Optional
from datetime import datetime, timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

logger = logging.getLogger(__name__)

# Scopes required for Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_oauth_flow(state: str = None) -> Flow:
    """Create OAuth flow for Google Drive"""
    client_config = {
        "web": {
            "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
            "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.environ.get("GOOGLE_REDIRECT_URI")]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=os.environ.get("GOOGLE_REDIRECT_URI")
    )
    
    return flow

def get_authorization_url() -> tuple:
    """Get the Google OAuth authorization URL"""
    flow = get_oauth_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    return authorization_url, state

def exchange_code_for_credentials(code: str) -> dict:
    """Exchange authorization code for credentials"""
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes) if credentials.scopes else [],
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None
    }

def get_drive_service_from_credentials(creds_data: dict):
    """Build Drive service from stored credentials"""
    credentials = Credentials(
        token=creds_data["access_token"],
        refresh_token=creds_data.get("refresh_token"),
        token_uri=creds_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=os.environ.get("GOOGLE_CLIENT_ID"),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
        scopes=creds_data.get("scopes", SCOPES)
    )
    
    # Refresh if expired
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(GoogleRequest())
    
    return build('drive', 'v3', credentials=credentials), credentials

def upload_image_to_drive(creds_data: dict, base64_data: str, filename: str, folder_id: str = None) -> Optional[dict]:
    """
    Upload a base64 encoded image to Google Drive using OAuth credentials
    
    Args:
        creds_data: Stored OAuth credentials
        base64_data: Base64 encoded image data
        filename: Name for the file
        folder_id: Optional folder ID to upload to
        
    Returns:
        dict with file_id and links, or None on failure
    """
    try:
        service, credentials = get_drive_service_from_credentials(creds_data)
        
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_data)
        
        # Determine MIME type
        mime_type = 'image/jpeg'
        if filename.lower().endswith('.png'):
            mime_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            mime_type = 'image/gif'
        
        # Create file metadata
        file_metadata = {'name': filename}
        
        # Add to folder if specified
        if folder_id:
            file_metadata['parents'] = [folder_id]
        
        # Create media upload
        media = MediaIoBaseUpload(
            io.BytesIO(image_bytes),
            mimetype=mime_type,
            resumable=True
        )
        
        # Upload file
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, webContentLink'
        ).execute()
        
        # Make file publicly viewable
        service.permissions().create(
            fileId=file['id'],
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
        
        logger.info(f"Uploaded image to Google Drive: {file['id']}")
        
        # Return updated credentials too (in case they were refreshed)
        return {
            'file_id': file['id'],
            'filename': file['name'],
            'web_view_link': file.get('webViewLink'),
            'direct_link': f"https://drive.google.com/uc?id={file['id']}",
            'updated_credentials': {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None
            } if credentials.token != creds_data["access_token"] else None
        }
        
    except Exception as e:
        logger.error(f"Failed to upload image to Google Drive: {str(e)}")
        return None

def delete_file_from_drive(creds_data: dict, file_id: str) -> bool:
    """Delete a file from Google Drive"""
    try:
        service, _ = get_drive_service_from_credentials(creds_data)
        service.files().delete(fileId=file_id).execute()
        logger.info(f"Deleted file from Google Drive: {file_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete file {file_id}: {str(e)}")
        return False

def test_drive_connection(creds_data: dict) -> dict:
    """Test the Google Drive connection"""
    try:
        service, _ = get_drive_service_from_credentials(creds_data)
        about = service.about().get(fields="user").execute()
        return {
            "connected": True,
            "user_email": about.get('user', {}).get('emailAddress', 'Unknown')
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}
