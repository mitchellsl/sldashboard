'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscriptions, updateSubscription, deleteSubscription } from '@/utils/supabase';
import { getUserProfile, updateUserProfile, uploadAvatar } from '@/utils/supabase';
import { formatDate, calculateUpdateStatus, calculateNextUpdate, sortSubscriptions } from '@/utils/helpers';
import { SearchBar } from '@/components/shared/SearchBar';
import { ClientTable } from '@/components/client/ClientTable';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { ProfileView } from '@/components/profile/ProfileView';
import { EditModal } from '@/components/shared/EditModal';
import { Subscription, SortField, SortDirection, UpdateHistory, UserProfile } from '@/components/types';
import { SubscriptionStats } from '@/components/overview/SubscriptionStats';

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeView, setActiveView] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('client_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [originalSubscription, setOriginalSubscription] = useState<Subscription | null>(null);
  const [isMonthlyCollapsed, setIsMonthlyCollapsed] = useState(false);
  const [isQuarterlyCollapsed, setIsQuarterlyCollapsed] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  const { signOut, user } = useAuth();

  useEffect(() => {
    fetchSubscriptions();
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredSubscriptions = subscriptions
    .filter(subscription => {
      const searchLower = searchTerm.toLowerCase();
      return (
        subscription.client_name.toLowerCase().includes(searchLower) ||
        subscription.frequency.toLowerCase().includes(searchLower) ||
        (subscription.wp_theme?.toLowerCase() || '').includes(searchLower) ||
        (subscription.php_version?.toLowerCase() || '').includes(searchLower) ||
        subscription.ga4_status.toLowerCase().includes(searchLower)
      );
    });

  const sortedSubscriptions = sortSubscriptions(filteredSubscriptions, sortField, sortDirection);

  async function fetchSubscriptions() {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile() {
    if (!user) return;
    try {
      const profile = await getUserProfile(user.id);
      setUserProfile(profile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }

  const handleEdit = (subscription: Subscription) => {
    setOriginalSubscription(subscription);
    setEditingSubscription(subscription);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingSubscription || !originalSubscription) return;

    try {
      setLoading(true);
      setError(null);
      
      const now = new Date();
      const updates: Partial<Subscription> = {
        ...editingSubscription,
      };

      // Check what type of update is being made
      const isHostingUpdate = JSON.stringify(editingSubscription.hosting_info) !== JSON.stringify(originalSubscription.hosting_info);
      const isDatabaseUpdate = JSON.stringify(editingSubscription.database_info) !== JSON.stringify(originalSubscription.database_info);
      const isStatusUpdate = editingSubscription.update_status !== originalSubscription.update_status;
      const isCommentUpdate = editingSubscription.comments !== originalSubscription.comments;

      // Only update timestamps and status if it's not just a hosting/database update
      if (!isHostingUpdate && !isDatabaseUpdate) {
        updates.last_update = now.toISOString();
        updates.next_update_due = calculateNextUpdate(editingSubscription).toISOString();
        
        if (isStatusUpdate) {
          updates.update_status = editingSubscription.update_status;
        }
        
        if (isCommentUpdate) {
          updates.comment_updated_at = now.toISOString();
          updates.comment_updated_by = user?.id;
        }
        
        updates.updated_by = user?.id || null;
      }
      
      const updatedSubscription = await updateSubscription(updates.id!, updates);
      
      setSubscriptions(prevSubscriptions => 
        prevSubscriptions.map(sub => 
          sub.id === updatedSubscription.id ? updatedSubscription : sub
        )
      );
      
      setIsEditModalOpen(false);
      setEditingSubscription(null);
      setOriginalSubscription(null);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    try {
      setIsProfileLoading(true);
      setProfileError(null);
      const updatedProfile = await updateUserProfile(user.id, updates);
      setUserProfile(updatedProfile);
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    
    try {
      setIsProfileLoading(true);
      setProfileError(null);
      const avatarUrl = await uploadAvatar(user.id, file);
      setUserProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setProfileError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsProfileLoading(false);
    }
  };

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  }

  async function handleImport() {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Import failed');
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
      setSelectedFile(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-white p-6">
        <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Laden...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-white p-6">
        <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
          <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fout: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-white p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 card p-4">
        <div className="text-2xl font-bold">Sociallane Dashboard</div>
        <div className="flex items-center gap-6">
          <nav className="flex space-x-4">
            <button 
              className={`nav-item ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveView('overview')}
            >
              Overzicht
            </button>
            <button 
              className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >
              Statistieken
            </button>
            <button 
              className={`nav-item ${activeView === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveView('profile')}
            >
              Profiel
            </button>
          </nav>
          {userProfile?.avatar_url && (
            <img
              src={userProfile.avatar_url}
              alt={userProfile.full_name || ''}
              className="w-8 h-8 rounded-full ring-2 ring-purple-500/30"
            />
          )}
          <button
            onClick={signOut}
            className="glass-button px-4 py-2 rounded-lg"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Content based on active view */}
      {activeView === 'overview' && (
        <div className="space-y-8">
          <SubscriptionStats
            subscriptions={subscriptions}
            selectedMonth={selectedMonth}
            onMonthSelect={setSelectedMonth}
          />

          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Alle Klanten</h2>
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    placeholder="Zoek klanten..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="glass-button h-10 px-4 flex items-center rounded-lg cursor-pointer"
                  >
                    Excel Importeren
                  </label>
                  {selectedFile && (
                    <button
                      onClick={handleImport}
                      disabled={loading}
                      className="glass-button h-10 px-4 flex items-center rounded-lg disabled:opacity-50"
                    >
                      Uploaden
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Maandelijkse Klanten</h2>
                  <button
                    onClick={() => setIsMonthlyCollapsed(!isMonthlyCollapsed)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg 
                      className={`w-5 h-5 transition-transform ${isMonthlyCollapsed ? '-rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <ClientTable
                  subscriptions={sortedSubscriptions}
                  onEdit={handleEdit}
                  formatDate={formatDate}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  frequency="monthly"
                  isCollapsed={isMonthlyCollapsed}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Kwartaal Klanten</h2>
                  <button
                    onClick={() => setIsQuarterlyCollapsed(!isQuarterlyCollapsed)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg 
                      className={`w-5 h-5 transition-transform ${isQuarterlyCollapsed ? '-rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <ClientTable
                  subscriptions={sortedSubscriptions}
                  onEdit={handleEdit}
                  formatDate={formatDate}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  frequency="quarterly"
                  isCollapsed={isQuarterlyCollapsed}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'analytics' && (
        <AnalyticsView
          subscriptions={sortedSubscriptions}
          selectedTimeframe={selectedTimeframe}
          userProfile={userProfile}
          userId={user?.id}
        />
      )}

      {activeView === 'profile' && (
        <ProfileView
          userProfile={userProfile}
          isLoading={isProfileLoading}
          error={profileError}
          onUpdateProfile={handleProfileUpdate}
          onAvatarUpload={handleAvatarUpload}
          userId={user?.id}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingSubscription && (
        <EditModal
          subscription={editingSubscription}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSave}
          onChange={updates => setEditingSubscription({ ...editingSubscription, ...updates })}
          isLoading={loading}
          userId={user?.id}
        />
      )}
    </div>
  );
}
