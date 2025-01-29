import { Subscription, SortField, SortDirection } from '../types';
import { ClientRow } from './ClientRow';

interface ClientTableProps {
  subscriptions: Subscription[];
  onEdit: (subscription: Subscription) => void;
  formatDate: (date: string | Date | null) => string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  frequency: 'monthly' | 'quarterly';
  isCollapsed: boolean;
}

export const ClientTable = ({
  subscriptions,
  onEdit,
  formatDate,
  sortField,
  sortDirection,
  onSort,
  frequency,
  isCollapsed
}: ClientTableProps) => {
  const filteredSubscriptions = subscriptions.filter(sub => sub.frequency === frequency);

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return null;
    return (
      <svg
        className={`w-4 h-4 ${sortField === field ? 'opacity-100' : 'opacity-0'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
    );
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <div className={`overflow-x-auto ${isCollapsed ? 'hidden' : ''}`}>
      <table className="w-full">
        <thead>
          <tr>
            <th
              onClick={() => onSort('client_name')}
              className="text-left px-4 py-3 hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                Klantnaam
                {getSortIcon('client_name')}
              </div>
            </th>
            <th
              onClick={() => onSort('frequency')}
              className="text-left px-4 py-3 hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                Frequentie
                {getSortIcon('frequency')}
              </div>
            </th>
            <th
              onClick={() => onSort('wp_theme')}
              className="text-left px-4 py-3 hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                WordPress Thema
                {getSortIcon('wp_theme')}
              </div>
            </th>
            <th
              onClick={() => onSort('php_version')}
              className="text-left px-4 py-3 hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                PHP Versie
                {getSortIcon('php_version')}
              </div>
            </th>
            <th
              onClick={() => onSort('ga4_status')}
              className="text-left px-4 py-3 hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                GA4 Status
                {getSortIcon('ga4_status')}
              </div>
            </th>
            <th className="text-left px-4 py-3">Laatste Update</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Acties</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {filteredSubscriptions.map(subscription => (
            <ClientRow
              key={subscription.id}
              subscription={subscription}
              onEdit={onEdit}
              formatDate={formatDate}
            />
          ))}
          {filteredSubscriptions.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-3 text-center text-gray-400">
                Geen klanten gevonden
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}; 