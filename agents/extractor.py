# agents/extractor.py
import os
from base64 import urlsafe_b64decode
from html2text import html2text
from utils.gmail_auth import get_gmail_service

SAVE_DIR = "data/newsletters"
os.makedirs(SAVE_DIR, exist_ok=True)

def fetch_and_save_newsletters(query="from:newsletters@techcrunch.com", max_results=5):
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
                'newsletters@yourstory.com' in sender_lower or 
                'thedailybriefing@substack.com' in sender_lower or 
                'dailybrief@cfr.org' in sender_lower):
            continue
        
        parts = payload.get('parts', [])
        content = ""
        for part in parts:
            if part.get('mimeType') == 'text/html' and 'data' in part.get('body', {}):
                body = urlsafe_b64decode(part['body']['data']).decode('utf-8')
                content = html2text(body)
                break
        
        if not content:
            # Try to get plain text content if HTML is not available
            for part in parts:
                if part.get('mimeType') == 'text/plain' and 'data' in part.get('body', {}):
                    body = urlsafe_b64decode(part['body']['data']).decode('utf-8')
                    content = body
                    break
        
        if not content and 'body' in payload and 'data' in payload['body']:
            # Try to get content from the main body if no parts are available
            body = urlsafe_b64decode(payload['body']['data']).decode('utf-8')
            if payload.get('mimeType') == 'text/html':
                content = html2text(body)
            else:
                content = body

        if not content:
            continue

        filename = f"{date[:16].replace(':', '-')}_{subject}.md"
        filepath = os.path.join(SAVE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"### From: {sender}\n### Date: {date}\n\n")
            f.write(content)
        
        saved_messages.append(msg[1])

    print(f"Saved {len(saved_messages)} newsletters.")
    return saved_messages
