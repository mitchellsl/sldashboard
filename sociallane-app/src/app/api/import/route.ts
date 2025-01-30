import { NextResponse } from 'next/server';
import { importExcelToSupabase } from '@/utils/supabase';
import { getExcelFileContent } from '@/utils/graph-service';

// Define valid columns and their mappings
const validColumns: Record<string, string[]> = {
  client_name: ['client_name', 'klantnaam', 'klant', 'name', 'naam'],
  frequency: ['frequency', 'frequentie', 'type', 'abonnement'],
  wp_theme: ['wp_theme', 'wordpress_theme', 'theme', 'thema'],
  php_version: ['php_version', 'php', 'version', 'versie'],
  ga4_status: ['ga4_status', 'ga4', 'google_analytics', 'analytics_status'],
  analytics_check: ['analytics_check', 'analytics', 'check'],
  last_update: ['last_update', 'laatste_update', 'update_date', 'datum'],
  next_update_due: ['next_update_due', 'volgende_update', 'next_date'],
  comments: ['comments', 'opmerkingen', 'notes', 'notities'],
  update_status: ['update_status', 'status']
};

type ValidColumn = keyof typeof validColumns;
type ColumnAliases = (typeof validColumns)[ValidColumn];
type ExcelRow = Record<string, string | number | boolean | null>;

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Get Excel data from OneDrive with mapped columns
    const { headers, rows } = await getExcelFileContent(filePath);
    
    // Map the headers to valid column names
    const columnMapping = new Map<string, ValidColumn>();
    headers.forEach((header: string) => {
      const normalizedHeader = header.toLowerCase().trim();
      for (const [validColumn, aliases] of Object.entries(validColumns)) {
        if (aliases.includes(normalizedHeader)) {
          columnMapping.set(header, validColumn as ValidColumn);
          break;
        }
      }
    });

    // Map the data using the column mapping
    const mappedRows = rows.map((row: ExcelRow) => {
      const mappedRow: Partial<Record<ValidColumn, any>> = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = columnMapping.get(key);
        if (mappedKey) {
          // Handle special cases
          if (mappedKey === 'frequency') {
            // Map frequency values
            const freqValue = String(value).toLowerCase().trim();
            if (freqValue.includes('maand') || freqValue.includes('month')) {
              mappedRow[mappedKey] = 'monthly';
            } else if (freqValue.includes('kwart') || freqValue.includes('quart')) {
              mappedRow[mappedKey] = 'quarterly';
            }
          } else if (mappedKey === 'ga4_status') {
            // Map GA4 status values
            const statusValue = String(value).toLowerCase().trim();
            if (statusValue.includes('ja') || statusValue.includes('yes')) {
              mappedRow[mappedKey] = 'yes';
            } else if (statusValue.includes('nee') || statusValue.includes('no')) {
              mappedRow[mappedKey] = 'no';
            } else {
              mappedRow[mappedKey] = 'pending';
            }
          } else if (mappedKey === 'analytics_check') {
            // Map analytics check values
            const checkValue = String(value).toLowerCase().trim();
            mappedRow[mappedKey] = checkValue.includes('ja') || 
                                  checkValue.includes('yes') || 
                                  checkValue === 'true' || 
                                  checkValue === '1' || 
                                  checkValue === '✓';
          } else {
            mappedRow[mappedKey] = value;
          }
        }
      });
      return mappedRow;
    });
    
    // Import mapped data to Supabase
    const result = await importExcelToSupabase(mappedRows);
    
    return NextResponse.json({ 
      message: 'Import successful',
      rowsImported: mappedRows.length,
      columnMapping: Object.fromEntries(columnMapping),
      skippedColumns: headers.filter((h: string) => !columnMapping.has(h))
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    );
  }
} 