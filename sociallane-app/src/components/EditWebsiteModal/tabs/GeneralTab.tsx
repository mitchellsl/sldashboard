"use client";

import { FormField } from "@/components/common/Form/FormField";

interface GeneralTabProps {
  generalDetails: {
    name: string;
    url: string;
  };
  onGeneralChange: (e: React.ChangeEvent<HTMLInputElement>, field: 'name' | 'url') => void;
}

export function GeneralTab({ generalDetails, onGeneralChange }: GeneralTabProps) {
  return (
    <div className="space-y-4">
      <FormField
        label="Name"
        value={generalDetails.name}
        onChange={(e) => onGeneralChange(e, 'name')}
      />
      <FormField
        label="URL"
        value={generalDetails.url}
        onChange={(e) => onGeneralChange(e, 'url')}
      />
    </div>
  );
} 