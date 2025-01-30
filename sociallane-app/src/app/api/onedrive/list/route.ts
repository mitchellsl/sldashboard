import { NextResponse } from 'next/server';
import { initializeOneDrive } from '@/utils/onedrive';

export async function GET() {
  try {
    const client = await initializeOneDrive();
    
    // Search for Excel files in OneDrive
    const response = await client
      .api('/me/drive/root/search(q=\'.xlsx\')')
      .get();

    const files = response.value.map((file: any) => ({
      id: file.id,
      name: file.name,
      path: file.name, // Using filename as path since we're searching from root
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing OneDrive files:', error);
    return NextResponse.json(
      { error: 'Failed to list OneDrive files' },
      { status: 500 }
    );
  }
} 