import os
import json
import glob
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from base64 import urlsafe_b64decode
from utils.gemini_client import get_gemini_response
from utils.gmail_auth import get_gmail_service

# Directory constants
NEWSLETTER_DIR = "data/newsletters"
INSIGHTS_DIR = "data/insights"
DAILY_INSIGHTS_DIR = os.path.join(INSIGHTS_DIR, "daily")
WEEKLY_INSIGHTS_DIR = os.path.join(INSIGHTS_DIR, "weekly")

# Create directories if they don't exist
for directory in [NEWSLETTER_DIR, INSIGHTS_DIR, DAILY_INSIGHTS_DIR, WEEKLY_INSIGHTS_DIR]:
    os.makedirs(directory, exist_ok=True)

def clean_html_content(html_content):
    """Clean HTML content to make it more suitable for LLM processing."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove script, style, and other non-content elements
    for element in soup(['script', 'style', 'meta', 'link', 'noscript', 'iframe']):
        element.extract()
    
    # Remove comments
    for comment in soup.find_all(text=lambda text: isinstance(text, str) and text.strip().startswith('<!--')):
        comment.extract()
    
    # Extract text with better formatting
    lines = []
    for element in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']):
        text = element.get_text(strip=True)
        if text:
            lines.append(text)
    
    # Join with newlines for better readability
    cleaned_text = "\n".join(lines)
    
    return cleaned_text

def process_newsletter_for_insights(email_id):
    """Process a single newsletter email and extract insights."""
    service = get_gmail_service()
    
    # Get the full email
    full_msg = service.users().messages().get(userId='me', id=email_id, format='full').execute()
    payload = full_msg['payload']
    headers = {h['name']: h['value'] for h in payload['headers']}
    
    subject = headers.get('Subject', 'No Subject')
    sender = headers.get('From', 'Unknown')
    date = headers.get('Date', 'Unknown')
    
    # Extract HTML content
    parts = payload.get('parts', [])
    content = ""
    for part in parts:
        if part.get('mimeType') == 'text/html' and 'data' in part.get('body', {}):
            body = urlsafe_b64decode(part['body']['data']).decode('utf-8')
            content = clean_html_content(body)
            break
    
    if not content and 'body' in payload and 'data' in payload['body']:
        # Try to get content from the main body if no parts are available
        body = urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        if payload.get('mimeType') == 'text/html':
            content = clean_html_content(body)
    
    if not content:
        return {
            "source": sender,
            "subject": subject,
            "date": date,
            "insights": "No content found to analyze"
        }
    
    # Limit content size for LLM
    max_content_length = 8000
    content_to_send = content[:max_content_length]
    
    # Generate insights using LLM
    print(f"Calling Gemini LLM for: {subject} ({date})")
    prompt = f"""
    You are an expert at extracting valuable insights from tech newsletters.
    
    Newsletter: {subject}
    From: {sender}
    Date: {date}
    
    Content:
    {content_to_send}
    
    Extract 3-5 key insights from this newsletter. Focus on:
    1. Important news or announcements
    2. Industry trends
    3. Actionable information
    4. Surprising or counterintuitive findings
    
    Format each insight as a brief, clear bullet point.
    """
    insights = get_gemini_response(prompt)
    print(f"Gemini LLM call complete for: {subject} ({date})")
    
    return {
        "source": sender,
        "subject": subject,
        "date": date,
        "insights": insights
    }

def process_daily_newsletters(messages=None, query=None, max_results=5):
    """Process newsletters and generate insights.
    
    Args:
        messages: List of message objects from fetch_and_save_newsletters
        query: Gmail search query (used if messages not provided)
        max_results: Maximum number of results to fetch (used if messages not provided)
    """
    if not messages:
        if query is None:
            # Calculate yesterday's date
            today = datetime.now()
            yesterday = today - timedelta(days=1)
            
            # Format date for Gmail query in YYYY/MM/DD format
            after_date = yesterday.strftime("%Y/%m/%d")
            
            # Updated query with the new email address
            query = f"(from:newsletters@techcrunch.com OR from:newsletters@yourstory.com OR from:thedailybriefing@substack.com OR from:dailybrief@cfr.org) category:primary after:{after_date}"
        
        service = get_gmail_service()
        results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
        messages = results.get('messages', [])
    
    if not messages:
        print("No newsletters found to process.")
        return []
    
    daily_insights = []
    for msg in messages:
        msg_id = msg['id']
        insights = process_newsletter_for_insights(msg_id)
        daily_insights.append(insights)
    
    # Save daily insights
    today = datetime.now().strftime("%Y-%m-%d")
    insights_file = os.path.join(DAILY_INSIGHTS_DIR, f"{today}.json")
    with open(insights_file, 'w', encoding='utf-8') as f:
        json.dump(daily_insights, f, indent=2)
    
    print(f"Saved {len(daily_insights)} newsletter insights for {today}")
    return daily_insights

def generate_weekly_summary():
    """Generate a weekly summary of insights (run on Sundays)."""
    # Check if today is Sunday
    if datetime.now().weekday() != 6:  # 0 is Monday, 6 is Sunday
        print("Weekly summary generation is only run on Sundays.")
        return None
    
    # Get insights from the past 7 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    all_insights = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        insights_file = os.path.join(DAILY_INSIGHTS_DIR, f"{date_str}.json")
        
        if os.path.exists(insights_file):
            with open(insights_file, 'r', encoding='utf-8') as f:
                daily_insights = json.load(f)
                all_insights.extend(daily_insights)
        
        current_date += timedelta(days=1)
    
    if not all_insights:
        print("No insights found for the past week.")
        return None
    
    # Prepare data for the LLM
    insights_text = json.dumps(all_insights, indent=2)
    
    # Generate weekly summary
    prompt = f"""
    You are an expert at synthesizing information and identifying trends.
    
    Below are insights extracted from tech newsletters over the past week:
    
    {insights_text}
    
    Please create a comprehensive weekly summary that:
    1. Identifies the most important themes and trends
    2. Highlights significant news or announcements
    3. Notes any contradictions or confirmations across different sources
    4. Provides strategic takeaways for someone in the tech industry
    
    Format the summary with clear sections, bullet points where appropriate, and a "Key Takeaways" section at the end.
    """
    
    weekly_summary = get_gemini_response(prompt, model_name="gemini-2.0-pro")
    
    # Save weekly summary
    week_end = datetime.now().strftime("%Y-%m-%d")
    week_start = (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d")
    summary_file = os.path.join(WEEKLY_INSIGHTS_DIR, f"{week_start}_to_{week_end}.md")
    
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(f"# Weekly Tech Insights: {week_start} to {week_end}\n\n")
        f.write(weekly_summary)
    
    print(f"Weekly summary saved to {summary_file}")
    return weekly_summary

def main():
    """Main function to run daily and weekly processing."""
    # Process daily newsletters
    process_daily_newsletters()
    
    # Generate weekly summary (will only runs on Sundays)
    generate_weekly_summary()

if __name__ == "__main__":
    main()
