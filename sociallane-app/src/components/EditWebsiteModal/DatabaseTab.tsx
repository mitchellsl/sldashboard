import { DatabaseDetails } from "@/types/hosting";

interface DatabaseTabProps {
  databaseDetails: DatabaseDetails;
  onDatabaseChange: (e: React.ChangeEvent<HTMLInputElement>, field: keyof DatabaseDetails) => void;
}

export function DatabaseTab({ databaseDetails, onDatabaseChange }: DatabaseTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Host</label>
        <input
          type="text"
          value={databaseDetails.host}
          onChange={(e) => onDatabaseChange(e, 'host')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Database Name</label>
        <input
          type="text"
          value={databaseDetails.databaseName}
          onChange={(e) => onDatabaseChange(e, 'databaseName')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Database User</label>
        <input
          type="text"
          value={databaseDetails.databaseUser}
          onChange={(e) => onDatabaseChange(e, 'databaseUser')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Password</label>
        <input
          type="password"
          value={databaseDetails.password}
          onChange={(e) => onDatabaseChange(e, 'password')}
          className="col-span-3 border rounded p-2"
        />
      </div>
    </div>
  );
} 