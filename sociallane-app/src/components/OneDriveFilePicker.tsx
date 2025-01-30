'use client';

import { useState } from 'react';
import { signInToMicrosoft, listExcelFiles } from '@/utils/onedrive';

interface FileItem {
  id: string;
  name: string;
  path: string;
  webUrl: string;
}

export default function OneDriveFilePicker() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInToMicrosoft();
      const excelFiles = await listExcelFiles();
      setFiles(excelFiles);
    } catch (err) {
      setError('Failed to sign in to Microsoft. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setImportStatus('Importing...');

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: selectedFile.path,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const data = await response.json();
      setImportStatus(`Successfully imported ${data.rowsImported} rows`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import file. Please try again.';
      setError(errorMessage);
      setImportStatus('Import failed');
      console.error('Import error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Loading...' : 'Sign in to Microsoft'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Select Excel File</h3>
          <div className="border rounded divide-y">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileSelect(file)}
                className={`p-3 cursor-pointer hover:bg-gray-50 ${
                  selectedFile?.id === file.id ? 'bg-blue-50' : ''
                }`}
              >
                <div>{file.name}</div>
                {selectedFile?.id === file.id && (
                  <div className="text-sm text-gray-500 mt-1">
                    <a 
                      href={file.webUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View in OneDrive
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="mb-4">
          <button
            onClick={handleImport}
            disabled={isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
          >
            {isLoading ? 'Importing...' : 'Import Selected File'}
          </button>
        </div>
      )}

      {importStatus && (
        <div className={`mt-4 p-3 rounded ${
          importStatus.includes('failed') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {importStatus}
        </div>
      )}
    </div>
  );
} 