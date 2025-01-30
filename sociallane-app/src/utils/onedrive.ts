'use client';

import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from "@azure/msal-browser";

// Check if we're in the browser environment
const isBrowser = typeof window !== 'undefined';

// Debug environment variables
console.log('Environment Variables Debug:');
console.log('NEXT_PUBLIC_AZURE_CLIENT_ID:', process.env.NEXT_PUBLIC_AZURE_CLIENT_ID);
console.log('NEXT_PUBLIC_AZURE_TENANT_ID:', process.env.NEXT_PUBLIC_AZURE_TENANT_ID);
console.log('NEXT_PUBLIC_REDIRECT_URI:', process.env.NEXT_PUBLIC_REDIRECT_URI);
console.log('Is Browser:', isBrowser);

// Get environment variables with fallbacks
const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

if (!clientId || !tenantId || !redirectUri) {
  console.error('Missing required environment variables:', {
    clientId,
    tenantId,
    redirectUri
  });
}

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: clientId || '',
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: true
  },
  system: {
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: false
  }
};

// Create loginRequest only when in browser environment
const getLoginRequest = () => ({
  scopes: ["User.Read", "Files.Read.All", "Sites.Read.All"],
  prompt: "select_account"
});

// Initialize MSAL instance only in browser environment
const msalInstance = isBrowser ? new PublicClientApplication(msalConfig) : null;

// Initialize MSAL if in browser
if (isBrowser && msalInstance) {
  msalInstance.initialize().catch(console.error);
}

let isAuthenticating = false;

export async function signInToMicrosoft() {
  if (!isBrowser || !msalInstance) {
    throw new Error('Microsoft authentication is only available in browser environment');
  }

  if (isAuthenticating) {
    console.log('Authentication already in progress');
    return;
  }

  try {
    isAuthenticating = true;
    const loginRequest = getLoginRequest();
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      try {
        return await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
      } catch (silentError) {
        if (silentError instanceof InteractionRequiredAuthError) {
          const result = await msalInstance.loginPopup(loginRequest);
          if (result) {
            msalInstance.setActiveAccount(result.account);
            return await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: result.account
            });
          }
        }
        throw silentError;
      }
    } else {
      const result = await msalInstance.loginPopup(loginRequest);
      if (result) {
        msalInstance.setActiveAccount(result.account);
        return await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: result.account
        });
      }
    }
    
    throw new Error('Failed to acquire token');
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  } finally {
    isAuthenticating = false;
  }
}

export async function signOutFromMicrosoft() {
  if (!isBrowser || !msalInstance) {
    throw new Error('Microsoft authentication is only available in browser environment');
  }

  try {
    const account = msalInstance.getActiveAccount();
    if (account) {
      await msalInstance.logoutPopup({
        account,
        postLogoutRedirectUri: redirectUri
      });
      await msalInstance.clearCache();
    }
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

export async function getMicrosoftConnectionStatus() {
  if (!isBrowser || !msalInstance) {
    return { isConnected: false, account: null };
  }

  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      try {
        // Try to silently acquire a token to verify the connection
        await msalInstance.acquireTokenSilent({
          ...getLoginRequest(),
          account
        });
        return { isConnected: true, account };
      } catch (error) {
        return { isConnected: false, account: null };
      }
    }
    return { isConnected: false, account: null };
  } catch (error) {
    console.error('Error checking connection status:', error);
    return { isConnected: false, account: null };
  }
}

export async function getUserProfile() {
  try {
    const { isConnected, account } = await getMicrosoftConnectionStatus();
    if (!isConnected || !account) {
      throw new Error('Not connected to Microsoft');
    }

    const accessToken = await signInToMicrosoft();
    const response = await makeGraphRequest(
      accessToken.accessToken,
      '/me'
    );

    return {
      displayName: response.displayName,
      email: response.userPrincipalName,
      id: response.id
    };
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    throw new Error(error.message || 'Failed to get user profile');
  }
}

async function makeGraphRequest(accessToken: string, endpoint: string) {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Graph API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Graph request failed:', error);
    throw new Error(error.message || 'Failed to make Graph request');
  }
}

async function ensureAuthenticated() {
  const authResult = await signInToMicrosoft();
  if (!authResult?.accessToken) {
    throw new Error('Failed to get access token. Please sign in to Microsoft first.');
  }
  return authResult.accessToken;
}

export async function listExcelFiles() {
  try {
    const accessToken = await ensureAuthenticated();
    
    // First try to find the recommended file directly
    let response = await makeGraphRequest(
      accessToken,
      `/me/drive/root/search(q='Update abonnementen DRIVE')?$select=id,name,webUrl,parentReference`
    );

    if (!response.value?.length) {
      // If recommended file not found, search for all Excel files
      response = await makeGraphRequest(
        accessToken,
        `/me/drive/root/search(q='*.xlsx OR *.xls')?$select=id,name,webUrl,parentReference&$orderby=name`
      );
    }

    if (!response.value || !Array.isArray(response.value)) {
      throw new Error('Invalid response format from OneDrive');
    }

    // Sort files to prioritize "Update abonnementen DRIVE.xlsx"
    const files = response.value.sort((a: any, b: any) => {
      const isTargetFileA = a.name.toLowerCase() === 'update abonnementen drive.xlsx';
      const isTargetFileB = b.name.toLowerCase() === 'update abonnementen drive.xlsx';
      
      if (isTargetFileA && !isTargetFileB) return -1;
      if (!isTargetFileA && isTargetFileB) return 1;
      return a.name.localeCompare(b.name);
    });

    return files.map((file: any) => ({
      id: file.id,
      name: file.name,
      path: file.name,
      webUrl: file.webUrl
    }));
  } catch (error: any) {
    console.error('Error listing Excel files:', error);
    throw error;
  }
}

export async function searchExcelFiles(searchTerm: string) {
  try {
    const accessToken = await ensureAuthenticated();

    const query = searchTerm ? 
      `/me/drive/root/search(q='${searchTerm} (*.xlsx OR *.xls)')?$select=id,name,webUrl,parentReference&$orderby=name` :
      `/me/drive/root/search(q='*.xlsx OR *.xls')?$select=id,name,webUrl,parentReference&$orderby=name`;

    const response = await makeGraphRequest(
      accessToken,
      query
    );

    if (!response.value || !Array.isArray(response.value)) {
      throw new Error('Invalid response format from OneDrive');
    }

    // Sort files to prioritize "Update abonnementen DRIVE.xlsx"
    const files = response.value.sort((a: any, b: any) => {
      const isTargetFileA = a.name.toLowerCase() === 'update abonnementen drive.xlsx';
      const isTargetFileB = b.name.toLowerCase() === 'update abonnementen drive.xlsx';
      
      if (isTargetFileA && !isTargetFileB) return -1;
      if (!isTargetFileA && isTargetFileB) return 1;
      return a.name.localeCompare(b.name);
    });

    // Filter to only include Excel files
    return files
      .filter((file: any) => file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls'))
      .map((file: any) => ({
        id: file.id,
        name: file.name,
        path: file.name,
        webUrl: file.webUrl
      }));
  } catch (error: any) {
    console.error('Error searching Excel files:', error);
    throw error;
  }
}

export async function getExcelFileContent(filePath: string) {
  try {
    const accessToken = await ensureAuthenticated();
    
    // First get the worksheet names
    const worksheetsResponse = await makeGraphRequest(
      accessToken,
      `/me/drive/root:/${filePath}:/workbook/worksheets`
    );

    if (!worksheetsResponse.value || !Array.isArray(worksheetsResponse.value)) {
      throw new Error('No worksheets found in Excel file');
    }

    // Get the first worksheet's name
    const firstWorksheet = worksheetsResponse.value[0];
    
    // Get the used range of the first worksheet
    const response = await makeGraphRequest(
      accessToken,
      `/me/drive/root:/${filePath}:/workbook/worksheets/${firstWorksheet.name}/usedRange`
    );

    if (!response.values) {
      throw new Error('No data found in Excel file');
    }

    // Extract headers and data
    const [headers, ...rows] = response.values;

    // Map the data to match database columns
    const mappedRows = rows.map((row: any[]) => {
      const mappedRow: any = {};
      headers.forEach((header: string, index: number) => {
        // Normalize header to match database columns
        const normalizedHeader = normalizeColumnName(header);
        if (isValidDatabaseColumn(normalizedHeader)) {
          mappedRow[normalizedHeader] = row[index];
        }
      });
      return mappedRow;
    });

    return {
      headers: headers.map((h: string) => normalizeColumnName(h)),
      rows: mappedRows
    };
  } catch (error: any) {
    console.error('Error getting Excel content:', error);
    throw error; // Preserve the original error for better handling
  }
}

// Helper function to normalize column names
function normalizeColumnName(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Helper function to check if column name is valid for database
function isValidDatabaseColumn(columnName: string): boolean {
  const validColumns = [
    'client_name',
    'frequency',
    'wp_theme',
    'php_version',
    'ga4_status',
    'analytics_check',
    'last_update',
    'next_update_due',
    'comments',
    'update_status'
  ];
  return validColumns.includes(columnName);
} 