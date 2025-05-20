import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ 
        success: false, 
        message: 'No filename provided' 
      }, { status: 400 });
    }
    
    // Check if this is a processed file
    const isProcessed = filename.startsWith('processed_');
    
    // Get paths
    const workspaceRoot = join(process.cwd(), '..');
    const newslettersDir = join(workspaceRoot, 'data', 'newsletters');
    const processedDir = join(workspaceRoot, 'data', 'processed');
    
    // Choose the appropriate directory
    const filePath = isProcessed 
      ? join(processedDir, filename)
      : join(newslettersDir, filename);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Newsletter file not found' 
      }, { status: 404 });
    }
    
    // Read the file
    const content = await readFile(filePath, 'utf-8');
    
    return NextResponse.json({ 
      success: true, 
      isProcessed,
      content 
    });
  } catch (error) {
    console.error('Error getting newsletter content:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to get newsletter content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 