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
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">Name</label>
        <input
          type="text"
          value={generalDetails.name}
          onChange={(e) => onGeneralChange(e, 'name')}
          className="col-span-3 border rounded p-2"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <label className="text-right col-span-1 self-center">URL</label>
        <input
          type="text"
          value={generalDetails.url}
          onChange={(e) => onGeneralChange(e, 'url')}
          className="col-span-3 border rounded p-2"
        />
      </div>
    </div>
  );
} 