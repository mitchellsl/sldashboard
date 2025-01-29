import { useState } from 'react';
import { Subscription } from '../types';
import { formatDate } from '@/utils/helpers';

interface EditModalProps {
  subscription: Subscription;
  onClose: () => void;
  onSave: () => Promise<void>;
  onChange: (updates: Partial<Subscription>) => void;
  isLoading: boolean;
  userId: string | undefined;
}

type TabType = 'general' | 'hosting' | 'database';

const defaultHostingInfo = {
  host: null,
  username: null,
  password: null,
  port: null,
};

const defaultDatabaseInfo = {
  host: null,
  name: null,
  user: null,
  password: null,
};

export const EditModal = ({
  subscription,
  onClose,
  onSave,
  onChange,
  isLoading,
  userId
}: EditModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Ensure hosting_info and database_info exist with default values
  const hosting_info = subscription.hosting_info || defaultHostingInfo;
  const database_info = subscription.database_info || defaultDatabaseInfo;

  const updateHostingInfo = (field: keyof Subscription['hosting_info'], value: string) => {
    onChange({
      hosting_info: {
        ...hosting_info,
        [field]: value
      }
    });
  };

  const updateDatabaseInfo = (field: keyof Subscription['database_info'], value: string) => {
    onChange({
      database_info: {
        ...database_info,
        [field]: value
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Klant Bewerken</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-700">
          <button
            className={`px-4 py-2 -mb-px ${
              activeTab === 'general'
                ? 'border-b-2 border-purple-500 text-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('general')}
          >
            Algemeen
          </button>
          <button
            className={`px-4 py-2 -mb-px ${
              activeTab === 'hosting'
                ? 'border-b-2 border-purple-500 text-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('hosting')}
          >
            Hosting Gegevens
          </button>
          <button
            className={`px-4 py-2 -mb-px ${
              activeTab === 'database'
                ? 'border-b-2 border-purple-500 text-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('database')}
          >
            Database
          </button>
        </div>
        
        <div className="space-y-6">
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Klantnaam</label>
                <input
                  type="text"
                  value={subscription.client_name}
                  onChange={(e) => onChange({ client_name: e.target.value })}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Frequentie</label>
                <select
                  value={subscription.frequency}
                  onChange={(e) => onChange({ frequency: e.target.value as 'monthly' | 'quarterly' })}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                >
                  <option value="monthly">Maandelijks</option>
                  <option value="quarterly">Per Kwartaal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">WordPress Thema</label>
                <input
                  type="text"
                  value={subscription.wp_theme || ''}
                  onChange={(e) => onChange({ wp_theme: e.target.value })}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">PHP Versie</label>
                <input
                  type="text"
                  value={subscription.php_version || ''}
                  onChange={(e) => onChange({ php_version: e.target.value })}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">GA4 Status</label>
                <select
                  value={subscription.ga4_status}
                  onChange={(e) => onChange({ ga4_status: e.target.value as 'yes' | 'no' | 'pending' })}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                >
                  <option value="yes">Ja</option>
                  <option value="pending">In Behandeling</option>
                  <option value="no">Nee</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Analytics Check</label>
                <select
                  value={subscription.analytics_check ? 'true' : 'false'}
                  onChange={(e) => onChange({ analytics_check: e.target.value === 'true' })}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                >
                  <option value="true">Ja</option>
                  <option value="false">Nee</option>
                </select>
              </div>

              {/* Comments Section */}
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Opmerkingen</label>
                <div className="space-y-2">
                  <textarea
                    value={subscription.comments || ''}
                    onChange={(e) => onChange({ comments: e.target.value })}
                    className="glass-input w-full px-4 py-2 rounded-lg min-h-[100px] resize-y"
                    placeholder="Voeg hier je opmerkingen toe..."
                  />
                  {subscription.comment_updated_by && subscription.comment_updated_at && (
                    <p className="text-sm text-gray-400">
                      Laatste opmerking door {subscription.comment_updated_by === userId ? 'jou' : 'een andere gebruiker'} op {formatDate(subscription.comment_updated_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hosting' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Host</label>
                <input
                  type="text"
                  value={hosting_info.host || ''}
                  onChange={(e) => updateHostingInfo('host', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Gebruikersnaam</label>
                <input
                  type="text"
                  value={hosting_info.username || ''}
                  onChange={(e) => updateHostingInfo('username', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Wachtwoord</label>
                <input
                  type="password"
                  value={hosting_info.password || ''}
                  onChange={(e) => updateHostingInfo('password', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Poort</label>
                <input
                  type="text"
                  value={hosting_info.port || ''}
                  onChange={(e) => updateHostingInfo('port', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Host</label>
                <input
                  type="text"
                  value={database_info.host || ''}
                  onChange={(e) => updateDatabaseInfo('host', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Database Naam</label>
                <input
                  type="text"
                  value={database_info.name || ''}
                  onChange={(e) => updateDatabaseInfo('name', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Database Gebruiker</label>
                <input
                  type="text"
                  value={database_info.user || ''}
                  onChange={(e) => updateDatabaseInfo('user', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Wachtwoord</label>
                <input
                  type="password"
                  value={database_info.password || ''}
                  onChange={(e) => updateDatabaseInfo('password', e.target.value)}
                  className="glass-input w-full px-4 py-2 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="glass-button px-4 py-2 rounded-lg"
            >
              Annuleren
            </button>
            <button
              onClick={onSave}
              disabled={isLoading}
              className="glass-button px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 