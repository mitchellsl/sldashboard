"use client";

import { TabButton } from "@/components/EditWebsiteModal/components/TabButton";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex space-x-4 mb-4 border-b">
      <TabButton 
        active={activeTab === "general"}
        onClick={() => onTabChange("general")}
      >
        General
      </TabButton>
      <TabButton 
        active={activeTab === "hosting"}
        onClick={() => onTabChange("hosting")}
      >
        Hosting Gegevens
      </TabButton>
      <TabButton 
        active={activeTab === "database"}
        onClick={() => onTabChange("database")}
      >
        Database
      </TabButton>
    </div>
  );
} 