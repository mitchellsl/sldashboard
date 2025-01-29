import { HostingDetails } from "@/types/hosting";

interface HostingTabProps {
  hostingDetails: HostingDetails;
  onHostingChange: (e: React.ChangeEvent<HTMLInputElement>, field: keyof HostingDetails) => void;
}

export function HostingTab({ hostingDetails, onHostingChange }: HostingTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Host</label>
        <input
          type="text"
          value={hostingDetails.host}
          onChange={(e) => onHostingChange(e, 'host')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Gebruikersnaam</label>
        <input
          type="text"
          value={hostingDetails.username}
          onChange={(e) => onHostingChange(e, 'username')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Wachtwoord</label>
        <input
          type="password"
          value={hostingDetails.password}
          onChange={(e) => onHostingChange(e, 'password')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Poort</label>
        <input
          type="text"
          value={hostingDetails.port}
          onChange={(e) => onHostingChange(e, 'port')}
          className="col-span-3 border rounded p-2"
        />
      </div>
    </div>
  );
} 