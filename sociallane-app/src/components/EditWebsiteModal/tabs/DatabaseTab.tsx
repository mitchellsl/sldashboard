"use client";

import { FormField } from "@/components/common/Form/FormField";
import { DatabaseDetails } from "@/types/hosting";

interface DatabaseTabProps {
  databaseDetails: DatabaseDetails;
  onDatabaseChange: (e: React.ChangeEvent<HTMLInputElement>, field: keyof DatabaseDetails) => void;
}

export function DatabaseTab({ databaseDetails, onDatabaseChange }: DatabaseTabProps) {
  return (
    <div className="space-y-4">
      <FormField
        label="Host"
        value={databaseDetails.host}
        onChange={(e) => onDatabaseChange(e, 'host')}
      />
      <FormField
        label="Database Name"
        value={databaseDetails.databaseName}
        onChange={(e) => onDatabaseChange(e, 'databaseName')}
      />
      <FormField
        label="Database User"
        value={databaseDetails.databaseUser}
        onChange={(e) => onDatabaseChange(e, 'databaseUser')}
      />
      <FormField
        label="Password"
        type="password"
        value={databaseDetails.password}
        onChange={(e) => onDatabaseChange(e, 'password')}
      />
    </div>
  );
} 