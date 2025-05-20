import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const workspaceRoot = join(process.cwd(), '..');
    const insightsDir = join(workspaceRoot, 'data', 'insights');
    
    if (!existsSync(insightsDir)) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No insights directory found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Find the most recent trends analysis file (now looking for HTML files)
    const files = await readdir(insightsDir);
    const trendsFiles = files.filter(file => file.startsWith('trends_analysis_') && file.endsWith('.html'));
    
    if (trendsFiles.length === 0) {
      // If no HTML files, try looking for markdown files as fallback
      const mdFiles = files.filter(file => file.startsWith('trends_analysis_') && file.endsWith('.md'));
      
      if (mdFiles.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'No insights analysis found' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Use markdown file as fallback
      mdFiles.sort().reverse();
      const latestFile = mdFiles[0];
      const filePath = join(insightsDir, latestFile);
      const content = await readFile(filePath, 'utf-8');
      
      // Convert markdown to simple HTML
      const htmlContent = `
        <div>
          <h1>Insights Analysis</h1>
          <div style="white-space: pre-wrap;">${content}</div>
        </div>
      `;
      
      return new Response(JSON.stringify({ 
        success: true, 
        content: htmlContent,
        filename: latestFile,
        format: 'markdown'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Sort HTML files by date (newest first)
    trendsFiles.sort().reverse();
    const latestFile = trendsFiles[0];
    
    // Read the HTML file
    const filePath = join(insightsDir, latestFile);
    const content = await readFile(filePath, 'utf-8');
    
    return new Response(JSON.stringify({ 
      success: true, 
      content,
      filename: latestFile,
      format: 'html'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching insights content:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to fetch insights content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 