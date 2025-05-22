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
    You are a professional newsletter analyst.
    Your task is to extract 3 to 5 concise, high-value insights from the following newsletter.

    Newsletter Metadata:

    Subject: {subject}
    From: {sender}
    Date: {date}

    Content:
    {content_to_send}

    Focus on extracting:
    Major news, updates, or announcements
    Emerging industry trends or shifts
    Actionable advice or recommendations
    Surprising data points or counterintuitive findings

    Format:

    Use bullet points
    Each point should be brief, clear, and informative
    Avoid fluff—focus on what's most useful or insightful
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
            query = f"(from:newsletters@techcrunch.com OR from:newsletters@yourstory.com OR from:thedailybriefing@substack.com OR from:dailybrief@cfr.org) category:primary after:{after_date} is:unread"
        
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

def analyze_insights_trends():
    """Analyze all daily insights and identify patterns and emerging trends."""
    # Find all daily insight files
    insight_files = glob.glob(os.path.join(DAILY_INSIGHTS_DIR, "*.json"))
    
    if not insight_files:
        print("No insight files found to analyze.")
        return "No insights available for analysis"
    
    # Combine insights from all files
    combined_insights = []
    for file_path in insight_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                insights = json.load(f)
                combined_insights.extend(insights)
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
    
    # Format the combined content for the LLM
    combined_content = json.dumps(combined_insights, indent=2)
    
    # Create prompt for trend analysis - requesting HTML-formatted response
    prompt = f"""
    You are a professional newsletter analyst. And Expert Explainer of news by building mental models and connecting the dots across sectors.
    I have some newsletters with me. Collect me some insights on them.
    I don't want plain summaries. I want you to go deep, find patterns across multiple newsletters, and give me key emerging trends you notice.

    ✅ Avoid generic, overused statements like "AI is changing the world." Instead, explain specifically how such trends 
    are unfolding—whether through new business models, shifts in user behavior, regulatory changes, or technological advancements. 

    Showcase first principles and second order effects with a brain emoji wherever relevant. 
    Explain what the mental model means and how it relates to the current news. 

    ✅ Format your response with HTML tags for better display:
    - Use <h1>, <h2>, <h3> tags for section headers
    - Use <p> tags for paragraphs
    - Use <b> or <strong> tags for important points
    - Use <img> tags for images
    - Use <ul> and <li> tags for bullet points
    - Use <blockquote> for notable quotes or highlights
    - The HTML should occupy the entire width of the screen.
    
    Structure your output clearly:
    - Start with a "TL;DR" section summarizing the key insights in 4–6 sentences.
    - Then go into detailed analysis using clear section headers.
    - Important:When mentioning a news, give a brief about it in 3-4 lines. Dont expect the reader to have read the entire newsletter.
    - Use bullet points only when citing specific facts, numbers, or data points.
    - End with a summary of the key trends for quick reference. In the Summary, Be analytical, connect the dots across sectors (Geopolitics, Technology, Business, Science, etc.) and across the newsletters, and highlight what's genuinely new or noteworthy—not what's obvious or widely known.
    - Also at the end of the Summary, Ask some questions that would urge the reader to think about the news deeply and challenge their assumptions.
    
    Newsletters:
    {combined_content}
    """
    
    # Generate analysis using Gemini
    analysis = get_gemini_response(prompt, model_name="gemini-2.0-flash")
    
    # Save the analysis as HTML
    today = datetime.now().strftime("%Y-%m-%d")
    analysis_file = os.path.join(INSIGHTS_DIR, f"trends_analysis_{today}.html")
    
    with open(analysis_file, 'w', encoding='utf-8') as f:
        # Add basic styling to the HTML content
        styled_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Newsletter Trends Analysis: {today}</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    color: #333;
                }}
                h1 {{
                    color: #4a148c;
                    font-size: 2em;
                    margin-top: 1.2em;
                    margin-bottom: 0.6em;
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 0.3em;
                }}
                h2 {{
                    color: #1a237e;
                    font-size: 1.5em;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }}
                h3 {{
                    color: #0d47a1;
                    font-size: 1.2em;
                    margin-top: 0.8em;
                    margin-bottom: 0.4em;
                }}
                p {{
                    margin-bottom: 1em;
                }}
                ul, ol {{
                    margin-bottom: 1em;
                    padding-left: 2em;
                }}
                li {{
                    margin-bottom: 0.5em;
                }}
                blockquote {{
                    border-left: 4px solid #bbdefb;
                    margin: 1em 0;
                    padding: 0.5em 1em;
                    background-color: #e3f2fd;
                    font-style: italic;
                }}
                strong, b {{
                    color: #000;
                }}
            </style>
        </head>
        <body>
            <h1>Newsletter Trends Analysis: {today}</h1>
            {analysis}
        </body>
        </html>
        """
        f.write(styled_html)
    
    print(f"Insights analysis saved to {analysis_file}")
    return analysis
