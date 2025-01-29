"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { HostingDetails, DatabaseDetails } from "@/types/hosting";
import type { Database } from "@/types/supabase";
import { Modal } from "@/components/common/Modal/Modal";
import { TabNavigation } from "./components/TabNavigation";
import { GeneralTab } from "./tabs/GeneralTab";
import { HostingTab } from "./tabs/HostingTab";
import { DatabaseTab } from "./tabs/DatabaseTab";

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Website">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "general" && (
            <GeneralTab 
              generalDetails={generalDetails}
              onGeneralChange={handleGeneralChange}
            />
          )}

          {activeTab === "hosting" && (
            <HostingTab 
              hostingDetails={hostingDetails}
              onHostingChange={handleHostingChange}
            />
          )}

          {activeTab === "database" && (
            <DatabaseTab 
              databaseDetails={databaseDetails}
              onDatabaseChange={handleDatabaseChange}
            />
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
    </Modal>
  );
} 