import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExcelData {
  headers: string[];
  rows: any[];
  sheetNames: string[];
  totalRows: number;
  totalColumns: number;
  sheetData: {
    [key: string]: {
      headers: string[];
      rows: any[];
      totalRows: number;
      totalColumns: number;
    };
  };
}

export async function readExcelFile(filePath: string): Promise<ExcelData> {
  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer);
  
  const sheetData: ExcelData['sheetData'] = {};
  
  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const headers = jsonData.length > 0 ? (jsonData[0] as string[]) : [];
    const rows = jsonData.slice(1);
    
    sheetData[sheetName] = {
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length
    };
  }
  
  // Use first sheet as default for backwards compatibility
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = sheetData[firstSheetName];
  
  return {
    headers: firstSheet.headers,
    rows: firstSheet.rows,
    sheetNames: workbook.SheetNames,
    totalRows: firstSheet.totalRows,
    totalColumns: firstSheet.totalColumns,
    sheetData
  };
}

export async function analyzeExcelStructure(): Promise<ExcelData> {
  const filePath = path.join(process.cwd(), 'data', '0. Update abonnementen DRIVE.xlsx');
  return readExcelFile(filePath);
}

export function getColumnSummary(data: ExcelData): { [key: string]: { type: string; uniqueValues: number } } {
  const summary: { [key: string]: { type: string; uniqueValues: number } } = {};
  
  data.headers.forEach((header, index) => {
    const values = new Set();
    let type = 'string';
    
    for (const row of data.rows) {
      const value = row[index];
      if (value !== undefined && value !== null) {
        values.add(value);
        
        if (type === 'string') {
          if (typeof value === 'number') type = 'number';
          else if (value instanceof Date) type = 'date';
          else if (typeof value === 'boolean') type = 'boolean';
        }
      }
    }
    
    summary[header] = {
      type,
      uniqueValues: values.size
    };
  });
  
  return summary;
} 