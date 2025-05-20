import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const workspaceRoot = join(process.cwd(), '..');
    const insightsDir = join(workspaceRoot, 'data', 'insights');
    
    console.log('Looking for insights in:', insightsDir);
    
    if (!existsSync(insightsDir)) {
      console.error('Insights directory not found:', insightsDir);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No insights directory found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Find the most recent trends analysis file
    const files = await readdir(insightsDir);
    console.log('Files in insights directory:', files);
    
    const trendsFiles = files.filter(file => file.startsWith('trends_analysis_'));
    console.log('Trends analysis files found:', trendsFiles);
    
    if (trendsFiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No insights analysis found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Sort files by date (newest first)
    trendsFiles.sort().reverse();
    const latestFile = trendsFiles[0];
    
    // Read the file
    const filePath = join(insightsDir, latestFile);
    console.log('Reading insights file:', filePath);
    
    const content = await readFile(filePath, 'utf-8');
    
    return new Response(JSON.stringify({ 
      success: true, 
      content,
      filename: latestFile
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to fetch insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 