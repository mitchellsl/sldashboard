"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { HostingDetails, DatabaseDetails } from "@/types/hosting";
import type { Database } from "@/types/supabase";

interface EditWebsiteModalProps {
  website: {
    id: string;
    name: string;
    url: string;
    hostingDetails?: HostingDetails | null;
    databaseDetails?: DatabaseDetails | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function EditWebsiteModal({ website, isOpen, onClose }: EditWebsiteModalProps) {
  const supabase = createClientComponentClient<Database>();
  const [activeTab, setActiveTab] = useState("general");
  const [generalDetails, setGeneralDetails] = useState({
    name: website.name || "",
    url: website.url || "",
  });
  const [hostingDetails, setHostingDetails] = useState<HostingDetails>({
    host: website?.hostingDetails?.host || "",
    username: website?.hostingDetails?.username || "",
    password: website?.hostingDetails?.password || "",
    port: website?.hostingDetails?.port || "",
  });

  const [databaseDetails, setDatabaseDetails] = useState<DatabaseDetails>({
    host: website?.databaseDetails?.host || "",
    databaseName: website?.databaseDetails?.databaseName || "",
    databaseUser: website?.databaseDetails?.databaseUser || "",
    password: website?.databaseDetails?.password || "",
  });

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'name' | 'url') => {
    setGeneralDetails(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleHostingChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof HostingDetails) => {
    setHostingDetails(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleDatabaseChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof DatabaseDetails) => {
    setDatabaseDetails(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('websites')
        .update({
          name: generalDetails.name,
          url: generalDetails.url,
          hosting_details: hostingDetails,
          database_details: databaseDetails,
        })
        .eq('id', website.id);

      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Error updating website:', error);
    }
  };

  console.log('Current tab:', activeTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Website</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex space-x-4 mb-4 border-b">
              <button
                type="button"
                className={`px-4 py-2 ${
                  activeTab === "general" 
                    ? "border-b-2 border-blue-500 text-blue-500" 
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
              <button
                type="button"
                className={`px-4 py-2 ${
                  activeTab === "hosting" 
                    ? "border-b-2 border-blue-500 text-blue-500" 
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("hosting")}
              >
                Hosting Gegevens
              </button>
              <button
                type="button"
                className={`px-4 py-2 ${
                  activeTab === "database" 
                    ? "border-b-2 border-blue-500 text-blue-500" 
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("database")}
              >
                Database
              </button>
            </div>

            {activeTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Name</label>
                  <input
                    type="text"
                    value={generalDetails.name}
                    onChange={(e) => handleGeneralChange(e, 'name')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">URL</label>
                  <input
                    type="text"
                    value={generalDetails.url}
                    onChange={(e) => handleGeneralChange(e, 'url')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
              </div>
            )}

            {activeTab === "hosting" && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Host</label>
                  <input
                    type="text"
                    value={hostingDetails.host}
                    onChange={(e) => handleHostingChange(e, 'host')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Gebruikersnaam</label>
                  <input
                    type="text"
                    value={hostingDetails.username}
                    onChange={(e) => handleHostingChange(e, 'username')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Wachtwoord</label>
                  <input
                    type="password"
                    value={hostingDetails.password}
                    onChange={(e) => handleHostingChange(e, 'password')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Poort</label>
                  <input
                    type="text"
                    value={hostingDetails.port}
                    onChange={(e) => handleHostingChange(e, 'port')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
              </div>
            )}

            {activeTab === "database" && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Host</label>
                  <input
                    type="text"
                    value={databaseDetails.host}
                    onChange={(e) => handleDatabaseChange(e, 'host')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Database Name</label>
                  <input
                    type="text"
                    value={databaseDetails.databaseName}
                    onChange={(e) => handleDatabaseChange(e, 'databaseName')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Database User</label>
                  <input
                    type="text"
                    value={databaseDetails.databaseUser}
                    onChange={(e) => handleDatabaseChange(e, 'databaseUser')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <label className="text-right col-span-1 self-center">Password</label>
                  <input
                    type="password"
                    value={databaseDetails.password}
                    onChange={(e) => handleDatabaseChange(e, 'password')}
                    className="col-span-3 border rounded p-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 