#!/usr/bin/env python3
# scheduler.py
import schedule
import time
import subprocess
import os
from datetime import datetime

def run_newsletter_processor():
    """Run the main newsletter processor script"""
    print(f"Running newsletter processor at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    subprocess.run(["python", "main.py"])

# Schedule the job to run daily at 8:00 AM
schedule.every().day.at("08:00").do(run_newsletter_processor)

# Also run immediately when the script starts
run_newsletter_processor()

print("Scheduler started. Will run daily at 8:00 AM.")
print("Press Ctrl+C to exit.")

# Keep the script running
while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute 