import { NextResponse } from 'next/server';
import { importExcelToSupabase } from '@/utils/supabase';
import { getExcelFileContent } from '@/utils/onedrive';

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Get Excel data from OneDrive
    const excelData = await getExcelFileContent(filePath);
    
    // Remove header row
    const rows = excelData.slice(1);
    
    // Import data to Supabase
    await importExcelToSupabase(rows);
    
    return NextResponse.json({ 
      message: 'Import successful',
      rowsImported: rows.length 
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
} 