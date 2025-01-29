import { NextResponse } from 'next/server';
import { readExcelFile } from '@/utils/excel';
import { importExcelToSupabase } from '@/utils/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = '/tmp/temp.xlsx'; // Temporary file path
    await require('fs').promises.writeFile(filePath, buffer);

    // Read Excel file
    const excelData = await readExcelFile(filePath);
    
    // Import data to Supabase
    await importExcelToSupabase(excelData.rows);
    
    // Clean up temporary file
    await require('fs').promises.unlink(filePath);

    return NextResponse.json({ 
      message: 'Import successful',
      rowsImported: excelData.rows.length 
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
} 