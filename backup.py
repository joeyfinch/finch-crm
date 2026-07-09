import os
import json
import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Scopes required for Google Sheets API
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_google_credentials():
    """
    Load credentials from environment variable or local JSON file.
    """
    credentials_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if credentials_json:
        try:
            info = json.loads(credentials_json)
            return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            logger.error(f"Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env var: {e}")
            
    # Fallback to local file (which should be in gitignore)
    local_path = os.path.join(os.path.dirname(__file__), 'google_credentials.json')
    if os.path.exists(local_path):
        try:
            return service_account.Credentials.from_service_account_file(local_path, scopes=SCOPES)
        except Exception as e:
            logger.error(f"Failed to load credentials from google_credentials.json: {e}")
            
    return None

def sync_collector_to_sheet(collector):
    """
    Appends a single collector's data to the configured Google Sheet.
    If the sheet is empty, it writes headers first.
    """
    sheet_id = os.environ.get('GOOGLE_SHEET_ID')
    if not sheet_id:
        logger.info("Google Sheet backup skipped: GOOGLE_SHEET_ID environment variable not set.")
        return False
        
    creds = get_google_credentials()
    if not creds:
        logger.info("Google Sheet backup skipped: No Google Service Account credentials found.")
        return False

    try:
        service = build('sheets', 'v4', credentials=creds)
        sheets_client = service.spreadsheets()

        # Define headers
        headers = [
            'ID', 'Name', 'Email', 'Phone', 'Personal Story', 'Artwork Interest',
            'Follow-up Status', 'Notes', 'Interest Level', 'Status', 'Next Action',
            'Source', 'Event', 'Staff Member', 'Created At', 'Updated At'
        ]

        # Prepare row values
        row_values = [
            collector.get('id', ''),
            collector.get('name', ''),
            collector.get('email', '') or '—',
            collector.get('phone', '') or '—',
            collector.get('story', '') or '—',
            collector.get('artwork_interest', '') or '—',
            collector.get('follow_up_status', 'Pending'),
            collector.get('notes', '') or '—',
            collector.get('interest_level', 'Medium'),
            collector.get('status', 'Active'),
            collector.get('next_action', '') or '—',
            collector.get('source', 'Exhibition'),
            collector.get('event_name', '') or '—',
            collector.get('staff_name', '') or '—',
            collector.get('created_at', ''),
            collector.get('updated_at', '')
        ]

        # 1. Check if sheet has values to write headers if empty
        # A1 is the first cell; if no sheet name prefix is set, sheets api uses the first sheet
        try:
            result = sheets_client.values().get(
                spreadsheetId=sheet_id,
                range='A1:A1'
            ).execute()
            rows = result.get('values', [])
        except Exception:
            rows = []

        if not rows:
            # Sheet is empty, write headers first
            sheets_client.values().append(
                spreadsheetId=sheet_id,
                range='A1',
                valueInputOption='USER_ENTERED',
                body={'values': [headers]}
            ).execute()

        # 2. Append the new row
        sheets_client.values().append(
            spreadsheetId=sheet_id,
            range='A1',
            valueInputOption='USER_ENTERED',
            body={'values': [row_values]}
        ).execute()

        logger.info(f"Successfully backed up collector '{collector.get('name')}' to Google Sheet.")
        return True

    except Exception as e:
        logger.error(f"Error syncing collector to Google Sheet: {e}")
        return False
