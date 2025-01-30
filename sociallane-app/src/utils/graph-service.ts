import { Client } from '@microsoft/microsoft-graph-client';
import { signInToMicrosoft } from './onedrive';

export async function getGraphClient() {
  const authResponse = await signInToMicrosoft();
  if (!authResponse?.accessToken) {
    throw new Error('Failed to get access token');
  }

  return Client.init({
    authProvider: async (done) => {
      done(null, authResponse.accessToken);
    }
  });
}

export async function getExcelFileContent(filePath: string) {
  try {
    const client = await getGraphClient();
    
    // Get the file
    const driveItem = await client.api(`/me/drive/root:/${filePath}`).get();
    if (!driveItem) {
      throw new Error('File not found');
    }

    // Get the workbook
    const workbook = await client.api(`/me/drive/items/${driveItem.id}/workbook/worksheets`).get();
    const firstWorksheet = workbook.value[0];

    // Get the used range of the first worksheet
    const range = await client.api(`/me/drive/items/${driveItem.id}/workbook/worksheets/${firstWorksheet.id}/usedRange`)
      .get();

    if (!range.values) {
      throw new Error('No data found in Excel file');
    }

    // Extract headers and data
    const [headers, ...rows] = range.values;

    return {
      headers,
      rows: rows.map((row: any[]) => {
        const rowData: Record<string, any> = {};
        headers.forEach((header: string, index: number) => {
          rowData[header] = row[index];
        });
        return rowData;
      })
    };
  } catch (error) {
    console.error('Error getting Excel content:', error);
    throw error;
  }
} 