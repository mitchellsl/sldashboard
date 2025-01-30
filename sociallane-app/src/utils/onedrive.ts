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

export async function listExcelFiles() {
  try {
    const accessToken = await signInToMicrosoft();
    const response = await makeGraphRequest(
      accessToken.accessToken,
      '/me/drive/root/search(q=\'.xlsx\')?$select=id,name,webUrl,parentReference&$orderby=name'
    );

    if (!response.value || !Array.isArray(response.value)) {
      throw new Error('Invalid response format from OneDrive');
    }

    return response.value.map((file: any) => ({
      id: file.id,
      name: file.name,
      path: file.name,
      webUrl: file.webUrl
    }));
  } catch (error: any) {
    console.error('Error listing Excel files:', error);
    throw new Error(error.message || 'Failed to list Excel files');
  }
}

export async function getExcelFileContent(filePath: string) {
  try {
    const accessToken = await signInToMicrosoft();
    const response = await makeGraphRequest(
      accessToken.accessToken,
      `/me/drive/root:/${filePath}:/workbook/worksheets/Sheet1/usedRange`
    );

    if (!response.values) {
      throw new Error('No data found in Excel file');
    }

    return response.values;
  } catch (error: any) {
    console.error('Error getting Excel content:', error);
    throw new Error(error.message || 'Failed to get Excel content');
  }
} 