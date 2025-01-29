import { Subscription } from '../types';

interface ClientRowProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  formatDate: (date: Date | string | null) => string;
}

export const ClientRow = ({ subscription, onEdit, formatDate }: ClientRowProps) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'overdue':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getGa4StatusStyles = (status: 'yes' | 'no' | 'pending') => {
    switch (status) {
      case 'yes':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'no':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const getFrequencyStyles = (frequency: 'monthly' | 'quarterly') => {
    return frequency === 'monthly' 
      ? 'bg-purple-500/20 text-purple-400'
      : 'bg-yellow-500/20 text-yellow-400';
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Voltooid';
      case 'pending':
        return 'In Behandeling';
      case 'overdue':
        return 'Te Laat';
      default:
        return status;
    }
  };

  const translateFrequency = (frequency: 'monthly' | 'quarterly') => {
    return frequency === 'monthly' ? 'Maandelijks' : 'Per Kwartaal';
  };

  const translateGa4Status = (status: 'yes' | 'no' | 'pending') => {
    switch (status) {
      case 'yes':
        return 'Ja';
      case 'pending':
        return 'In Behandeling';
      case 'no':
        return 'Nee';
      default:
        return status;
    }
  };

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50">
      <td className="px-4 py-3">{subscription.client_name}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs ${getFrequencyStyles(subscription.frequency)}`}>
          {translateFrequency(subscription.frequency)}
        </span>
      </td>
      <td className="px-4 py-3">{subscription.wp_theme || '-'}</td>
      <td className="px-4 py-3">{subscription.php_version || '-'}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs ${getGa4StatusStyles(subscription.ga4_status)}`}>
          {translateGa4Status(subscription.ga4_status)}
        </span>
      </td>
      <td className="px-4 py-3">{formatDate(subscription.last_update)}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyles(subscription.update_status)}`}>
          {translateStatus(subscription.update_status)}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onEdit(subscription)}
          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md text-sm transition-colors"
        >
          Bewerken
        </button>
      </td>
    </tr>
  );
}; 