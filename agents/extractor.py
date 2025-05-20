# agents/extractor.py
import os
from base64 import urlsafe_b64decode
from utils.gmail_auth import get_gmail_service

SAVE_DIR = "data/newsletters"
os.makedirs(SAVE_DIR, exist_ok=True)

def fetch_and_save_newsletters(query="from:newsletters@techcrunch.com OR from:newsletter@businessmint.com OR from:newsletter@inc42emails.com OR from:newsletters@yourstory.com OR from:thedailybriefing@substack.com OR from:geopoliticsreport@substack.com OR from:dailybrief@cfr.org", max_results=10):
    service = get_gmail_service()
    results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
    messages = results.get('messages', [])
    
    if not messages:
        print(f"No messages found matching query: '{query}'")
        return []
    
    saved_messages = []
    for msg in enumerate(messages):
        msg_id = msg[1]['id']
        full_msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        payload = full_msg['payload']
        headers = {h['name']: h['value'] for h in payload['headers']}
        subject = headers.get('Subject', 'No Subject').replace(" ", "_").replace("/", "-")
        sender = headers.get('From', 'Unknown')
        date = headers.get('Date', 'Unknown')
        
        # Check if the email matches our filter
        sender_lower = sender.lower()
        if not ('newsletters@techcrunch.com' in sender_lower or 
                'newsletter@businessmint.com' in sender_lower or
                'newsletter@inc42emails.com' in sender_lower or
                'newsletters@yourstory.com' in sender_lower or 
                'thedailybriefing@substack.com' in sender_lower or 
                'geopoliticsreport@substack.com' in sender_lower or
                'dailybrief@cfr.org' in sender_lower):
            continue
        
        parts = payload.get('parts', [])
        content = ""
        
        # First try to get HTML content
        for part in parts:
            if part.get('mimeType') == 'text/html' and 'data' in part.get('body', {}):
                html_content = urlsafe_b64decode(part['body']['data']).decode('utf-8')
                content = html_content
                break
        
        # If no HTML content, try plain text
        if not content:
            for part in parts:
                if part.get('mimeType') == 'text/plain' and 'data' in part.get('body', {}):
                    text_content = urlsafe_b64decode(part['body']['data']).decode('utf-8')
                    # Convert plain text to basic HTML
                    content = f"<html><body><pre>{text_content}</pre></body></html>"
                    break
        
        # Try the main body if no parts found
        if not content and 'body' in payload and 'data' in payload['body']:
            body_content = urlsafe_b64decode(payload['body']['data']).decode('utf-8')
            if payload.get('mimeType') == 'text/html':
                content = body_content
            else:
                # Convert plain text to basic HTML
                content = f"<html><body><pre>{body_content}</pre></body></html>"

        if not content:
            continue

        # Save as HTML with metadata in HTML comments
        filename = f"{date[:16].replace(':', '-')}_{subject}.html"
        filepath = os.path.join(SAVE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            # Add metadata as HTML comments
            f.write(f"<!--\nFrom: {sender}\nDate: {date}\n-->\n")
            # Add the HTML content
            f.write(content)
        
        saved_messages.append(msg[1])

    print(f"Saved {len(saved_messages)} newsletters as HTML.")
    return saved_messages
