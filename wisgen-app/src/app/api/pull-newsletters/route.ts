import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';

// Function to get LLM response (replace with your actual LLM integration)
async function getLLMResponse(htmlContent: string) {
  try {
    // Use relative URL since we're making a server-to-server request
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const url = `${protocol}://${host}/api/gemini-process`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: htmlContent,
        modelName: 'gemini-2.0-flash'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process with Gemini');
    }
    
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    // Fallback to the original placeholder behavior
    return `
      <!-- Processed with fallback -->
      <html>
        <head>
          <title>Processed Newsletter</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Processed Newsletter</h1>
          ${htmlContent}
        </body>
      </html>
    `;
  }
}

// Process all newsletters in the directory
async function processNewslettersWithLLM(workspaceRoot: string) {
  try {
    const newslettersDir = join(workspaceRoot, 'data', 'newsletters');
    const processedDir = join(workspaceRoot, 'data', 'processed');
    
    // Ensure processed directory exists
    if (!existsSync(processedDir)) {
      await mkdir(processedDir, { recursive: true });
    }
    
    // Get all files in the directory
    const files = await readdir(newslettersDir);
    const htmlFiles = files.filter(file => file.endsWith('.html'));
    
    console.log(`Found ${htmlFiles.length} newsletters to process`);
    
    // Process each file
    const results = [];
    for (const file of htmlFiles) {
      const processedPath = join(processedDir, `processed_${file}`);
      
      // Skip if already processed
      if (existsSync(processedPath)) {
        console.log(`Skipping already processed file: ${file}`);
        results.push({
          filename: file,
          processedFilename: `processed_${file}`,
          status: 'skipped'
        });
        continue;
      }
      
      // Read the file
      const filePath = join(newslettersDir, file);
      const htmlContent = await readFile(filePath, 'utf-8');
      
      // Process with LLM
      console.log(`Processing newsletter: ${file}`);
      const processedHtml = await getLLMResponse(htmlContent);
      
      // Save processed HTML
      await writeFile(processedPath, processedHtml);
      
      results.push({
        filename: file,
        processedFilename: `processed_${file}`,
        status: 'processed'
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error processing newsletters:', error);
    throw error;
  }
}

export async function POST() {
  try {
    // Go up just ONE directory to reach WisdomGenerator from wisgen-app
    const workspaceRoot = join(process.cwd(), '..');
    const mainPyPath = join(workspaceRoot, 'main.py');
    
    // Log the path to verify it exists
    console.log('Checking if Python script exists at:', mainPyPath);
    if (!existsSync(mainPyPath)) {
      console.error('Python script not found at:', mainPyPath);
      return NextResponse.json({ 
        success: false, 
        message: 'Python script not found',
        path: mainPyPath
      }, { status: 500 });
    }
    
    console.log('Running Python script:', mainPyPath);
    
    // Spawn Python process with the working directory set to workspace root
    const pythonProcess = spawn('python3', [mainPyPath], {
      cwd: workspaceRoot, // Set working directory to workspace root
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
      }
    });
    
    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        const message = data.toString();
        console.log('Python stdout:', message);
        output += message;
      });

      pythonProcess.stderr.on('data', (data) => {
        const message = data.toString();
        console.error('Python stderr:', message);
        error += message;
      });

      pythonProcess.on('close', async (code) => {
        console.log('Python process exited with code:', code);
        if (code === 0) {
          // Python script completed successfully, now process the newsletters with LLM
          try {
            console.log('Starting to process newsletters with LLM...');
            const processResults = await processNewslettersWithLLM(workspaceRoot);
            
            resolve(NextResponse.json({ 
              success: true, 
              message: 'Newsletters pulled and processed successfully',
              output,
              processResults
            }));
          } catch (processError) {
            console.error('Error processing newsletters:', processError);
            reject(NextResponse.json({ 
              success: false, 
              message: 'Newsletters pulled but processing failed',
              error: processError instanceof Error ? processError.message : 'Unknown error',
              output
            }, { status: 500 }));
          }
        } else {
          reject(NextResponse.json({ 
            success: false, 
            message: 'Failed to pull newsletters',
            error: error || `Process exited with code ${code}`,
            path: mainPyPath
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        reject(NextResponse.json({ 
          success: false, 
          message: 'Failed to start Python process',
          error: err.message,
          path: mainPyPath
        }, { status: 500 }));
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