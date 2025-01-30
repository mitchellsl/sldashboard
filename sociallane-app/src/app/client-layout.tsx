'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { useEffect, useState } from 'react';

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
    postLogoutRedirectUri: "/",
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true
  },
  system: {
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  }
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!msalInstance) {
      try {
        const instance = new PublicClientApplication(msalConfig);
        
        // Add event callbacks
        instance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS) {
            console.log('Login successful');
          } else if (event.eventType === EventType.LOGIN_FAILURE) {
            console.error('Login failed:', event.error);
            setError('Login failed. Please try again.');
          }
        });

        instance.initialize().then(() => {
          // Store the instance globally
          (window as any).__msal = instance;
          setMsalInstance(instance);
        }).catch((err) => {
          console.error('Failed to initialize MSAL:', err);
          setError('Failed to initialize authentication. Please refresh the page.');
        });
      } catch (err) {
        console.error('Error creating MSAL instance:', err);
        setError('Failed to set up authentication. Please refresh the page.');
      }
    }
  }, [msalInstance]);

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded">
        {error}
        <button 
          onClick={() => window.location.reload()} 
          className="ml-4 underline"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!msalInstance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Initializing...</span>
      </div>
    );
  }

  return (
    <AuthProvider>
      <MsalProvider instance={msalInstance}>
        {children}
      </MsalProvider>
    </AuthProvider>
  );
} 