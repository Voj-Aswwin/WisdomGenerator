# main.py
from agents.extractor import fetch_and_save_newsletters
from agents.insights_generator import process_daily_newsletters, generate_weekly_summary
import os
from datetime import datetime, timedelta

# Ensure API_KEY is set for Gemini
if "API_KEY" not in os.environ:
    print("Warning: API_KEY environment variable not set for Gemini LLM")
    print("Please set it using: export API_KEY='your_gemini_api_key'")

if __name__ == "__main__":
    # Calculate yesterday's date
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    
    # Format date for Gmail query in YYYY/MM/DD format
    after_date = yesterday.strftime("%Y/%m/%d")
    
    # Fetch newsletters with query
    query = f"(from:newsletters@techcrunch.com OR from:newsletters@yourstory.com OR from:thedailybriefing@substack.com OR from:dailybrief@cfr.org) (category:primary OR category:updates) after:{after_date}"
    messages = fetch_and_save_newsletters(
        query=query,
        max_results=10
    )
    
    # Process newsletters and generate insights
    if messages:
        process_daily_newsletters(messages=messages)
        
        # Generate weekly summary (only runs on Sundays)
        generate_weekly_summary()
    else:
        print("No newsletters found to process for insights.")
