"use client";

import { FormField } from "@/components/common/Form/FormField";
import { HostingDetails } from "@/types/hosting";

interface HostingTabProps {
  hostingDetails: HostingDetails;
  onHostingChange: (e: React.ChangeEvent<HTMLInputElement>, field: keyof HostingDetails) => void;
}

export function HostingTab({ hostingDetails, onHostingChange }: HostingTabProps) {
  return (
    <div className="space-y-4">
      <FormField
        label="Host"
        value={hostingDetails.host}
        onChange={(e) => onHostingChange(e, 'host')}
      />
      <FormField
        label="Gebruikersnaam"
        value={hostingDetails.username}
        onChange={(e) => onHostingChange(e, 'username')}
      />
      <FormField
        label="Wachtwoord"
        type="password"
        value={hostingDetails.password}
        onChange={(e) => onHostingChange(e, 'password')}
      />
      <FormField
        label="Poort"
        value={hostingDetails.port}
        onChange={(e) => onHostingChange(e, 'port')}
      />
    </div>
  );
} 