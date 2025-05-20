import { exec } from 'child_process';
import { join } from 'path';

export async function GET() {
  return new Promise((resolve) => {
    const workspaceRoot = join(process.cwd(), '..');
    
    // Execute a simple command to run the Python script
    const cmd = `cd "${workspaceRoot}" && python3 -c "
from agents.insights_generator import analyze_insights_trends
analyze_insights_trends()
print('Done')
"`;
    
    console.log('Running command:', cmd);
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Error running Python script:', error);
        console.error('stderr:', stderr);
        resolve(new Response(JSON.stringify({ 
          success: false, 
          message: `Error: ${error.message}`,
          stderr
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
        return;
      }
      
      console.log('Python script output:', stdout);
      
      resolve(new Response(JSON.stringify({ 
        success: true, 
        message: 'Script executed successfully',
        output: stdout
      }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  });
} 