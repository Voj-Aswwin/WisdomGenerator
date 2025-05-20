import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    // Get the path to the newsletters directory
    const workspaceRoot = join(process.cwd(), '..');
    const newslettersDir = join(workspaceRoot, 'data', 'newsletters');
    const processedDir = join(workspaceRoot, 'data', 'processed');
    
    // Check if the directory exists
    if (!existsSync(newslettersDir)) {
      return NextResponse.json({ 
        success: false, 
        message: 'No newsletters directory found',
        newsletters: []
      });
    }
    
    // Get all files in the directory
    const files = await readdir(newslettersDir);
    
    // Map to track processed versions
    const processedMap = new Map();
    
    // If processed directory exists, get list of processed files
    if (existsSync(processedDir)) {
      const processedFiles = await readdir(processedDir);
      for (const file of processedFiles) {
        if (file.startsWith('processed_') && file.endsWith('.html')) {
          const originalFilename = file.replace('processed_', '');
          processedMap.set(originalFilename, file);
        }
      }
    }
    
    // Filter HTML files and extract info from filenames
    const newsletters = await Promise.all(
      files
        .filter(file => file.endsWith('.html'))
        .map(async (file) => {
          // Try to parse date and subject from filename
          const filePath = join(newslettersDir, file);
          const content = await readFile(filePath, 'utf-8');
          
          // Extract metadata from HTML comments
          const fromMatch = content.match(/<!--\s*From:\s*(.*?)\s*$/m);
          const dateMatch = content.match(/<!--\s*.*\s*Date:\s*(.*?)\s*$/m);
          
          const source = fromMatch ? fromMatch[1] : 'Unknown Source';
          const date = dateMatch ? dateMatch[1] : 'Unknown Date';
          
          // Extract subject from filename
          const subjectMatch = file.match(/\d{4}-\d{2}-\d{2}_(.*)\.html/) || 
                              file.match(/(.*)\.html/);
          const subject = subjectMatch ? subjectMatch[1].replace(/_/g, ' ') : file;
          
          return {
            source: source.split('<')[0].trim(), // Remove email address if present
            subject,
            date,
            filename: file,
            processedFilename: processedMap.get(file) || null
          };
        })
    );
    
    // Sort by date (newest first)
    newsletters.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Newsletters retrieved successfully',
      newsletters 
    });
  } catch (error) {
    console.error('Error getting newsletters:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to get newsletters',
      error: error instanceof Error ? error.message : 'Unknown error',
      newsletters: []
    }, { status: 500 });
  }
} 