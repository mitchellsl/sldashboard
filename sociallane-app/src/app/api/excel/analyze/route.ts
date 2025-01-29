import { NextResponse } from 'next/server';
import { analyzeExcelStructure } from '@/utils/excel';

export async function GET() {
  try {
    const data = await analyzeExcelStructure();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
    return NextResponse.json(
      { error: 'Failed to analyze Excel file' },
      { status: 500 }
    );
  }
} 