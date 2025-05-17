# WisdomGenerator
Tool to parse my subscribed newsletters and draw out useful insights from it.

## Overview
WisdomGenerator is a tool that:
1. Fetches newsletters from your Gmail account (from 12 PM yesterday to 12 PM today)
2. Processes them to extract key insights using Gemini AI
3. Generates daily insights for each newsletter
4. Creates a comprehensive weekly summary on Sundays

## Supported Newsletter Sources
- newsletters@techcrunch.com
- newsletters@yourstory.com
- thedailybriefing@substack.com
- dailybrief@cfr.org

## Setup

### Prerequisites
- Python 3.7+
- Gmail account with newsletters
- Gemini API key

### Installation
1. Clone this repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set up Gmail API:
   - Create a project in Google Cloud Console
   - Enable Gmail API
   - Create OAuth credentials and download as `credentials.json`
   - Place `credentials.json` in the project root

4. Set your Gemini API key:
   ```
   export API_KEY='your_gemini_api_key'
   ```

## Usage

### One-time run
```
python main.py
```

### Daily scheduled run
```
python scheduler.py
```
This will run the processor immediately and schedule it to run daily at 8:00 AM.

### Cron job setup
To run as a cron job, add the following to your crontab (this example runs daily at 1:00 PM):
```
0 13 * * * cd /path/to/WisdomGenerator && export API_KEY='your_gemini_api_key' && python main.py >> /path/to/WisdomGenerator/logs/wisdom_generator.log 2>&1
```

## Output
- Daily insights are saved to `data/insights/daily/YYYY-MM-DD.json`
- Weekly summaries are saved to `data/insights/weekly/YYYY-MM-DD_to_YYYY-MM-DD.md`

## Components
- `agents/extractor.py`: Fetches newsletters from Gmail
- `agents/insights_generator.py`: Processes newsletters and generates insights
- `utils/gemini_client.py`: Handles communication with Gemini AI
- `utils/gmail_auth.py`: Handles Gmail authentication
- `scheduler.py`: Schedules daily runs
- `main.py`: Main entry point 
