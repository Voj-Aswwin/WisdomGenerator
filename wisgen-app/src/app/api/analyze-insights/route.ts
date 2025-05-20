import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

// Set a timeout for the Python process (in milliseconds)
const PYTHON_PROCESS_TIMEOUT = 60000; // 1 minute

export async function POST() {
  try {
    const workspaceRoot = join(process.cwd(), '..');
    const insightsDir = join(workspaceRoot, 'data', 'insights', 'daily');
    
    console.log('Checking insights directory:', insightsDir);
    
    // Check if insights directory exists
    if (!existsSync(insightsDir)) {
      console.error('Insights directory not found:', insightsDir);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No insights directory found',
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Running insights analysis...');
    
    return new Promise((resolve) => {
      let isResolved = false;
      
      // Set a timeout to handle hanging processes
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          console.error('Python process timed out after', PYTHON_PROCESS_TIMEOUT, 'ms');
          resolve(new Response(JSON.stringify({ 
            success: false, 
            message: 'Process timed out. This might be due to a long-running operation or an error in the Python script.'
          }), { 
            status: 504, // Gateway Timeout
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }, PYTHON_PROCESS_TIMEOUT);
      
      // Call the analyze_insights_trends function with proper error handling
      try {
        const pythonProcess = spawn('python3', [
          '-c', 
          `
import sys
try:
    from agents.insights_generator import analyze_insights_trends
    analyze_insights_trends()
    print("Analysis completed successfully")
    sys.exit(0)
except Exception as e:
    print(f"Error in Python script: {str(e)}", file=sys.stderr)
    sys.exit(1)
          `
        ], {
          cwd: workspaceRoot,
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
          }
        });
        
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

        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          if (isResolved) return;
          
          isResolved = true;
          console.log('Python process exited with code:', code);
          
          if (code === 0) {
            resolve(new Response(JSON.stringify({ 
              success: true, 
              message: 'Insights analysis generated successfully',
              output
            }), {
              headers: { 'Content-Type': 'application/json' }
            }));
          } else {
            console.error('Python process failed with code:', code);
            console.error('Error output:', error);
            resolve(new Response(JSON.stringify({ 
              success: false, 
              message: 'Failed to analyze insights',
              error: error || `Process exited with code ${code}`
            }), { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
        });

        pythonProcess.on('error', (err) => {
          clearTimeout(timeout);
          if (isResolved) return;
          
          isResolved = true;
          console.error('Failed to start Python process:', err);
          resolve(new Response(JSON.stringify({ 
            success: false, 
            message: 'Failed to start Python process',
            error: err.message
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        });
      } catch (spawnError) {
        clearTimeout(timeout);
        if (isResolved) return;
        
        isResolved = true;
        console.error('Error spawning Python process:', spawnError);
        resolve(new Response(JSON.stringify({ 
          success: false, 
          message: 'Error spawning Python process',
          error: spawnError instanceof Error ? spawnError.message : 'Unknown error'
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    });
  } catch (error) {
    console.error('Error analyzing insights:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to analyze insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 