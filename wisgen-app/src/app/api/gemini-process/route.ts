import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const { html, modelName = "gemini-2.5-flash-preview-05-20" } = await request.json();
    
    if (!html) {
      return NextResponse.json({ 
        success: false, 
        message: 'No HTML content provided' 
      }, { status: 400 });
    }
    
    // Path to workspace root
    const workspaceRoot = join(process.cwd(), '..');
    
    // Save HTML to a temporary file to avoid command line length limits
    const tempFilePath = join(workspaceRoot, 'temp_html.txt');
    await writeFile(tempFilePath, html);
    
    // Create a simple Python script to run
    const pythonCode = `
import sys
from utils.gemini_client import get_gemini_response

prompt = """
You are an expert HTML editor and newsletter summariser with a deep understanding of Finance, Technology, and Geopolitics. I will provide a newsletter in raw HTML format, which may include advertisements, promotional sections, tracking/affiliate links, and technical jargon. Your job is to transform this newsletter into a clean, simplified, and insightful version suitable for a general but curious Business Student in India.

Please do the following:

1. Clean Up HTML
Remove all advertisements, sponsored content, email footers, promotions, and irrelevant sections (like unsubscribe links, social share buttons, etc.).
Strip out tracking links, UTM parameters, and affiliate links. If a reference link is valuable, replace it with a clean version of the same link.

2. Simplify the Content
Rewrite dense or technical text into simple, clear language.
Break up long paragraphs, add headings/subheadings where necessary, and make the newsletter reader-friendly.

3. Add a TL;DR Summary
At the top of the newsletter, insert a "TL;DR" section that summarises the key points in a paragraph of 5-6 lines. 

4. Add Key Trends & Takeaways

At the end, add a "Key Trends Noticed" section.
Provide a deep, analytical insights  comparies snippets across news papers and domains— not generic summaries or trite like (AI is the future, US is becoming Protectionist).
Explain in detail why a particular trend matters and how it connects to broader macroeconomic, policy, political or technology shifts.

5. Add Explanations for Jargon
After each major section, add a "Jargon Explained" box where you:
Briefly define any complex or uncommon financial, tech, or geopolitical term used in that section.
Keep it concise (1–2 lines per term), written in simple language.

6. Add Ideas for Business Section with a light bulb emoji. 
After a section if there is any business opportunity that you see, add a "Business Idea" box where you:
Briefly layout a business opportunity in this sector with a clearly defined problem statement. Focus on problems which can be solved with software alone. or a small MicroSAAS products

7. Final Output
Return only well-formed, valid HTML.

Preserve useful formatting (like headings, lists, bold text, images, infographics etc.)

Now, here's the HTML input:
"""
with open("${tempFilePath.replace(/\\/g, '\\\\')}", "r", encoding="utf-8") as f:
    html_content = f.read()

result = get_gemini_response(prompt + html_content, "${modelName}")
print(result)
`;
    
    // Execute the Python code directly
    const pythonProcess = spawn('python3', ['-c', pythonCode], {
      cwd: workspaceRoot,
      env: { ...process.env }
    });
    
    // Process the response
    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
        // Clean up the temporary file
        try {
          await unlink(tempFilePath);
        } catch (err) {
          console.error('Error deleting temporary file:', err);
        }
        
        if (code === 0) {
          resolve(NextResponse.json({ 
            success: true, 
            content: output.trim()
          }));
        } else {
          reject(NextResponse.json({ 
            success: false, 
            message: 'Failed to process with Gemini',
            error: error || `Process exited with code ${code}`
          }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 