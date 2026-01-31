"""
Google Drive Upload Utility for J-APP
Handles folder structure and file naming conventions

Folder Structure:
- FormType/Year/Month/A/ (first photos)
- FormType/Year/Month/B/ (second photos)
- FormType/Year/Month/C/ (third photos)
- FormType/Year/Month/D/ (fourth photos)

File Naming:
- {case-number}.jpg (e.g., JS-TAL-JAN-C0001.jpg)
"""
import os
import io
import base64
import logging
from datetime import datetime
from typing import Optional, List, Dict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive.file']

class DriveUploader:
    def __init__(self, creds_data: dict, root_folder_id: str):
        """Initialize with OAuth credentials and root folder ID"""
        self.creds_data = creds_data
        self.root_folder_id = root_folder_id
        self.service = None
        self.folder_cache = {}  # Cache folder IDs to avoid repeated lookups
        self._init_service()
    
    def _init_service(self):
        """Initialize Google Drive service"""
        credentials = Credentials(
            token=self.creds_data["access_token"],
            refresh_token=self.creds_data.get("refresh_token"),
            token_uri=self.creds_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
            scopes=self.creds_data.get("scopes", SCOPES)
        )
        
        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(GoogleRequest())
            # Update stored credentials
            self.creds_data["access_token"] = credentials.token
            if credentials.expiry:
                self.creds_data["expiry"] = credentials.expiry.isoformat()
        
        self.service = build('drive', 'v3', credentials=credentials)
    
    def _get_or_create_folder(self, folder_name: str, parent_id: str) -> str:
        """Get existing folder or create new one"""
        cache_key = f"{parent_id}/{folder_name}"
        
        if cache_key in self.folder_cache:
            return self.folder_cache[cache_key]
        
        # Search for existing folder
        query = f"name='{folder_name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = self.service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])
        
        if files:
            folder_id = files[0]['id']
        else:
            # Create folder
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            folder = self.service.files().create(body=file_metadata, fields='id').execute()
            folder_id = folder['id']
            logger.info(f"Created folder: {folder_name}")
        
        self.folder_cache[cache_key] = folder_id
        return folder_id
    
    def _build_folder_path(self, form_type: str, date: datetime, photo_index: int = 0, project_code: str = None) -> str:
        """
        Build folder path and return the final folder ID
        
        Structure: ProjectCode/FormType/Year/Month/A (or B/C/D)
        - Month as 3-letter name (Jan, Feb, etc.)
        - Subfolders A/B/C/D for photo position
        
        Example: VVC/Catching/2026/Jan/A/
        """
        import calendar
        
        year = str(date.year)
        month_name = calendar.month_abbr[date.month]  # Jan, Feb, Mar, etc.
        
        # Photo subfolder names (uppercase A, B, C, D)
        subfolder_names = ['A', 'B', 'C', 'D']
        subfolder_name = subfolder_names[min(photo_index, 3)]
        
        # Start from root folder
        parent_id = self.root_folder_id
        
        # If project code provided, create project folder first
        if project_code:
            parent_id = self._get_or_create_folder(project_code.upper(), parent_id)
        
        # Get or create form type folder (Catching, Surgery, etc.)
        form_folder_id = self._get_or_create_folder(form_type, parent_id)
        
        # Get or create year folder
        year_folder_id = self._get_or_create_folder(year, form_folder_id)
        
        # Get or create month folder (using name: Jan, Feb, etc.)
        month_folder_id = self._get_or_create_folder(month_name, year_folder_id)
        
        # Get or create A/B/C/D subfolder
        photo_folder_id = self._get_or_create_folder(subfolder_name, month_folder_id)
        
        return photo_folder_id
    
    def _generate_filename(self, case_number: str) -> str:
        """
        Generate filename from case number
        
        Format: {case-number}.jpg
        Example: JS-TAL-JAN-C0001.jpg
        """
        return f"{case_number}.jpg"
    
    def upload_image(
        self,
        base64_data: str,
        form_type: str,
        case_number: str,
        date: datetime = None,
        photo_index: int = 0,
        project_code: str = None
    ) -> Optional[Dict]:
        """
        Upload an image to Google Drive with proper folder structure
        
        Args:
            base64_data: Base64 encoded image
            form_type: One of 'Catching', 'Surgery', 'Release', 'Feeding', 'Post-op-care', 'Config-files'
            case_number: Case number (e.g., JS-VVC-JAN-C0001)
            date: Date for the photo (defaults to now)
            photo_index: 0=A (first), 1=B (second), 2=C (third), 3=D (fourth)
            project_code: 3-letter project code (e.g., VVC, TAL)
            
        Folder Structure:
            ProjectCode/FormType/Year/Month/A/{case-number}.jpg (first photo)
            Example: VVC/Catching/2026/Jan/A/JS-VVC-JAN-C0001.jpg
            
        Returns:
            Dict with file_id, direct_link, filename, folder_path
        """
        import calendar
        
        if not self.service:
            logger.error("Google Drive service not initialized")
            return None
        
        try:
            date = date or datetime.now()
            
            # Handle Config-files separately
            if form_type == 'Config-files':
                folder_id = self._get_or_create_folder('Config-files', self.root_folder_id)
                filename = f"{case_number}.jpg"  # case_number here is actually the config file name
            else:
                # Build folder path: ProjectCode/FormType/Year/Month/A (or B/C/D)
                folder_id = self._build_folder_path(form_type, date, photo_index, project_code)
                
                # Generate filename: {case-number}.jpg
                filename = self._generate_filename(case_number)
            
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_data)
            
            # Determine MIME type
            mime_type = 'image/jpeg'
            if filename.lower().endswith('.png'):
                mime_type = 'image/png'
            
            # Check if file already exists (to overwrite)
            query = f"name='{filename}' and '{folder_id}' in parents and trashed=false"
            existing = self.service.files().list(q=query, fields="files(id)").execute()
            existing_files = existing.get('files', [])
            
            if existing_files:
                # Delete existing file
                self.service.files().delete(fileId=existing_files[0]['id']).execute()
                logger.info(f"Deleted existing file: {filename}")
            
            # Create file metadata
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }
            
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
                fields='id, name, webViewLink'
            ).execute()
            
            # Make file publicly viewable
            self.service.permissions().create(
                fileId=file['id'],
                body={'type': 'anyone', 'role': 'reader'}
            ).execute()
            
            # Subfolder letter
            subfolder = ['A', 'B', 'C', 'D'][min(photo_index, 3)]
            month_name = calendar.month_abbr[date.month]
            
            # Build folder path string
            if project_code:
                folder_path = f"{project_code.upper()}/{form_type}/{date.year}/{month_name}/{subfolder}"
            else:
                folder_path = f"{form_type}/{date.year}/{month_name}/{subfolder}"
            
            logger.info(f"Uploaded: {folder_path}/{filename}")
            
            return {
                'file_id': file['id'],
                'filename': filename,
                'direct_link': f"https://drive.google.com/uc?id={file['id']}",
                'web_view_link': file.get('webViewLink'),
                'folder_path': folder_path
            }
            
        except Exception as e:
            logger.error(f"Failed to upload image: {str(e)}")
            return None
    
    def upload_multiple_images(
        self,
        images: List[str],
        form_type: str,
        case_number: str,
        date: datetime = None,
        project_code: str = None
    ) -> List[Optional[Dict]]:
        """Upload multiple images (up to 4)"""
        results = []
        for i, base64_data in enumerate(images[:4]):
            if base64_data:
                result = self.upload_image(base64_data, form_type, case_number, date, i, project_code)
                results.append(result)
            else:
                results.append(None)
        return results
    
    def get_updated_credentials(self) -> dict:
        """Return updated credentials if they were refreshed"""
        return self.creds_data


async def get_drive_uploader(db, user_id: str = None) -> Optional[DriveUploader]:
    """
    Get DriveUploader instance with credentials from database.
    
    Multi-user safe: If user_id is provided, uses that user's credentials.
    Falls back to any available credentials for backward compatibility.
    
    Args:
        db: Database connection
        user_id: The ID of the user whose Drive credentials should be used
    
    Returns:
        DriveUploader instance or None if no credentials found
    """
    creds = None
    
    # If user_id provided, try to get that user's credentials
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "google_drive_credentials": 1})
        if user and user.get("google_drive_credentials"):
            creds = user["google_drive_credentials"]
            logger.info(f"Using Google Drive credentials for user {user_id}")
    
    # Fallback: try legacy drive_credentials collection (for backward compatibility)
    if not creds:
        creds = await db.drive_credentials.find_one({"user_id": "system"}, {"_id": 0})
        if creds:
            logger.info("Using legacy system Google Drive credentials")
    
    if not creds:
        logger.warning("No Google Drive credentials found")
        return None
    
    root_folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
    if not root_folder_id:
        logger.warning("GOOGLE_DRIVE_FOLDER_ID not set")
        return None
    
    return DriveUploader(creds, root_folder_id)


async def get_drive_uploader_for_user(db, current_user: dict) -> Optional[DriveUploader]:
    """
    Convenience function to get DriveUploader for a user from their user dict.
    
    Args:
        db: Database connection
        current_user: The user dict (from get_current_user dependency)
    
    Returns:
        DriveUploader instance or None if no credentials found
    """
    return await get_drive_uploader(db, user_id=current_user.get("id"))
