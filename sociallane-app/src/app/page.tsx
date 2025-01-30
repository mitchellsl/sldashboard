'use client';

import { useEffect, useState } from 'react';
import { Subscription, getSubscriptions, updateSubscription, deleteSubscription } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, getUserProfile, updateUserProfile, uploadAvatar } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';
import { HostingDetails, DatabaseDetails } from "@/types/hosting";
import { supabase } from '@/utils/supabase';
import { signInToMicrosoft, signOutFromMicrosoft, getMicrosoftConnectionStatus, listExcelFiles } from '@/utils/onedrive';
import { AccountInfo } from '@azure/msal-browser';

type SortField = 'client_name' | 'frequency' | 'wp_theme' | 'php_version' | 'ga4_status';
type SortDirection = 'asc' | 'desc';

type UpdateHistory = {
  client_name: string;
  last_update: string;
  updated_by: string;
  frequency: 'monthly' | 'quarterly';
  update_status: 'completed' | 'pending' | 'overdue';
};

interface MicrosoftStatus {
  isConnected: boolean;
  account: AccountInfo | null;
}

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeView, setActiveView] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const months = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
  ];
  
  // Add new state for search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('client_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [originalSubscription, setOriginalSubscription] = useState<Subscription | null>(null);
  const { signOut, user } = useAuth();

  // Add new state for analytics
  const [updateHistory, setUpdateHistory] = useState<UpdateHistory[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Add new state for user profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Add new state for table collapse
  const [isMonthlyCollapsed, setIsMonthlyCollapsed] = useState(false);
  const [isQuarterlyCollapsed, setIsQuarterlyCollapsed] = useState(false);
  const [isUpdatesProgressCollapsed, setIsUpdatesProgressCollapsed] = useState(false);
  const [isMonthsModalOpen, setIsMonthsModalOpen] = useState(false);

  // Add new state for hosting and database details
  const [activeTab, setActiveTab] = useState("general");
  const [hostingDetails, setHostingDetails] = useState<HostingDetails>({
    host: editingSubscription?.hosting_details?.host || "",
    username: editingSubscription?.hosting_details?.username || "",
    password: editingSubscription?.hosting_details?.password || "",
    port: editingSubscription?.hosting_details?.port || "",
  });

  const [databaseDetails, setDatabaseDetails] = useState<DatabaseDetails>({
    host: editingSubscription?.database_details?.host || "",
    databaseName: editingSubscription?.database_details?.databaseName || "",
    databaseUser: editingSubscription?.database_details?.databaseUser || "",
    password: editingSubscription?.database_details?.password || "",
  });

  // Add new state for updates modal
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  // Add new state for previous subscriptions and revert button
  const [previousSubscriptions, setPreviousSubscriptions] = useState<Subscription[] | null>(null);
  const [showRevertButton, setShowRevertButton] = useState(false);

  // Add new state for Microsoft connection status and Excel files
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftStatus>({ isConnected: false, account: null });
  const [excelFiles, setExcelFiles] = useState<Array<{ id: string; name: string; webUrl: string }>>([]);

  useEffect(() => {
    fetchSubscriptions();
    if (user) {
      fetchUserProfile();
    }
    const checkMicrosoftStatus = async () => {
      try {
        const status = await getMicrosoftConnectionStatus();
        setMicrosoftStatus(status);
        if (status.isConnected) {
          const files = await listExcelFiles();
          setExcelFiles(files);
        }
      } catch (error) {
        console.error('Error checking Microsoft status:', error);
      }
    };
    checkMicrosoftStatus();
  }, [user]);

  // Add sort function
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Add filter and sort logic
  const filteredAndSortedSubscriptions = subscriptions
    .filter(subscription => {
      const searchLower = searchTerm.toLowerCase();
      return (
        subscription.client_name.toLowerCase().includes(searchLower) ||
        subscription.frequency.toLowerCase().includes(searchLower) ||
        subscription.wp_theme?.toLowerCase().includes(searchLower) ||
        subscription.php_version?.toLowerCase().includes(searchLower) ||
        subscription.ga4_status.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      const compareResult = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

  // Add function to calculate update status
  const calculateUpdateStatus = (subscription: Subscription) => {
    const today = new Date();
    const lastUpdate = subscription.last_update ? new Date(subscription.last_update) : null;
    const nextDue = subscription.next_update_due ? new Date(subscription.next_update_due) : null;

    if (!lastUpdate || !nextDue) return 'pending';
    if (nextDue < today) return 'overdue';
    if (lastUpdate <= nextDue) return 'completed';
    return 'pending';
  };

  // Add function to get next update date
  const calculateNextUpdate = (subscription: Subscription) => {
    const today = new Date();
    const lastUpdate = subscription.last_update ? new Date(subscription.last_update) : today;
    
    if (subscription.frequency === 'monthly') {
      return new Date(lastUpdate.setMonth(lastUpdate.getMonth() + 1));
    } else {
      return new Date(lastUpdate.setMonth(lastUpdate.getMonth() + 3));
    }
  };

  // Add function to format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Add function to get pending updates for selected month
  const getPendingUpdates = () => {
    return subscriptions.filter(subscription => {
      const nextUpdate = subscription.next_update_due ? new Date(subscription.next_update_due) : null;
      if (!nextUpdate) return false;
      
      // Only check if the update is due in the selected month
      return nextUpdate.getMonth() === selectedMonth;
    });
  };

  // Add function to mark update as completed
  const markUpdateAsCompleted = async (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    try {
      const nextUpdateDate = calculateNextUpdate({
        ...subscription,
        last_update: new Date().toISOString()
      });

      const updates = {
        ...subscription,
        last_update: new Date().toISOString(),
        next_update_due: nextUpdateDate.toISOString(),
        update_status: 'completed' as const,
        updated_by: user?.id || null
      };

      await updateSubscription(subscriptionId, updates);
      
      // Update local state immediately
      setSubscriptions(prevSubscriptions => 
        prevSubscriptions.map(sub => 
          sub.id === subscriptionId ? { ...sub, ...updates } : sub
        )
      );

      // Close modal if no more pending updates
      const remainingUpdates = getPendingUpdates().filter(s => s.id !== subscriptionId);
      if (remainingUpdates.length === 0) {
        setIsUpdatesModalOpen(false);
      }
    } catch (err) {
      console.error('Error marking update as completed:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark update as completed');
    }
  };

  // Add function to get updates count for a specific month
  const getMonthUpdatesCount = (month: number) => {
    return subscriptions.filter(subscription => {
      const nextUpdate = subscription.next_update_due ? new Date(subscription.next_update_due) : null;
      return nextUpdate?.getMonth() === month;
    }).reduce((counts, subscription) => {
      const status = subscription.update_status || 'pending';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  };

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

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  }

  async function handleImport() {
    if (!selectedFile) return;

    try {
      setLoading(true);
      setError(null);
      setPreviousSubscriptions(subscriptions);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      // Refresh the subscriptions list
      await fetchSubscriptions();
      setShowRevertButton(true);
      
      // Show detailed success message
      const message = `Import voltooid: ${result.success} nieuwe klanten toegevoegd, ${result.skipped} dubbele overgeslagen, ${result.error} fouten.`;
      setError(message);

    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
      setSelectedFile(null);
    }
  }

  async function handleRevertImport() {
    if (!previousSubscriptions) return;

    try {
      setLoading(true);
      
      // Revert each subscription back to its previous state
      for (const subscription of previousSubscriptions) {
        await updateSubscription(subscription.id, subscription);
      }

      await fetchSubscriptions();
      setPreviousSubscriptions(null);
      setShowRevertButton(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert import');
    } finally {
      setLoading(false);
    }
  }

  // Add edit handler
  const handleEdit = (subscription: Subscription) => {
    setOriginalSubscription(subscription);
    setEditingSubscription(subscription);
    setIsEditModalOpen(true);
  };

  // Modify handleSave to include update tracking
  const handleSave = async () => {
    if (!editingSubscription || !originalSubscription) return;

    try {
      setLoading(true);
      
      const nextUpdateDate = calculateNextUpdate({
        ...editingSubscription,
        last_update: new Date().toISOString()
      });

      // Create the update object
      const updates: Partial<Subscription> = {
        ...editingSubscription,
        hosting_details: {
          host: hostingDetails.host,
          username: hostingDetails.username,
          password: hostingDetails.password,
          port: hostingDetails.port
        },
        database_details: {
          host: databaseDetails.host,
          databaseName: databaseDetails.databaseName,
          databaseUser: databaseDetails.databaseUser,
          password: databaseDetails.password
        },
        last_update: new Date().toISOString(),
        next_update_due: nextUpdateDate.toISOString(),
        updated_by: user?.id || null
      };

      console.log('Sending update data:', updates);

      // Use the updateSubscription function
      const updatedData = await updateSubscription(editingSubscription.id, updates);
      
      console.log('Update successful:', updatedData);

      // Refresh and close
      await fetchSubscriptions();
      setIsEditModalOpen(false);
      setEditingSubscription(null);
      setOriginalSubscription(null);

    } catch (err) {
      console.error('Save error details:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add analytics content
  const renderAnalyticsView = () => {
    const getTimeframeLabel = () => {
      switch (selectedTimeframe) {
        case 'week': return 'This Week';
        case 'month': return 'This Month';
        case 'year': return 'This Year';
      }
    };

    const totalUpdates = subscriptions.filter(s => s.last_update).length;
    const completedUpdates = subscriptions.filter(s => s.update_status === 'completed').length;
    const pendingUpdates = subscriptions.filter(s => s.update_status === 'pending').length;
    const overdueUpdates = subscriptions.filter(s => s.update_status === 'overdue').length;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Statistics Card */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-6">Update Statistics</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold">{totalUpdates}</div>
              <div className="text-gray-400 text-sm">Total Updates</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{completedUpdates}</div>
              <div className="text-gray-400 text-sm">Completed</div>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{pendingUpdates}</div>
              <div className="text-gray-400 text-sm">Pending</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{overdueUpdates}</div>
              <div className="text-gray-400 text-sm">Overdue</div>
            </div>
          </div>
        </div>

        {/* Update Timeline */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Update Timeline</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTimeframe('week')}
                className={`px-3 py-1 rounded-lg ${
                  selectedTimeframe === 'week' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setSelectedTimeframe('month')}
                className={`px-3 py-1 rounded-lg ${
                  selectedTimeframe === 'month' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setSelectedTimeframe('year')}
                className={`px-3 py-1 rounded-lg ${
                  selectedTimeframe === 'year' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Year
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 text-gray-400">Client</th>
                  <th className="text-left py-3 text-gray-400">Last Update</th>
                  <th className="text-left py-3 text-gray-400">Updated By</th>
                  <th className="text-left py-3 text-gray-400">Frequency</th>
                  <th className="text-left py-3 text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions
                  .filter(s => s.last_update)
                  .sort((a, b) => new Date(b.last_update!).getTime() - new Date(a.last_update!).getTime())
                  .map((subscription) => (
                    <tr key={subscription.id} className="border-b border-gray-700">
                      <td className="py-3">{subscription.client_name}</td>
                      <td className="py-3">{formatDate(subscription.last_update)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {subscription.updated_by && (
                            <>
                              <img 
                                src={subscription.updated_by === user?.id && userProfile?.avatar_url ? userProfile.avatar_url : '/default-avatar.svg'} 
                                alt="User Avatar"
                                className="w-6 h-6 rounded-full bg-gray-700"
                              />
                              <span>
                                {subscription.updated_by === user?.id && userProfile
                                  ? userProfile.display_name
                                  : 'Admin'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          subscription.frequency === 'monthly' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {subscription.frequency}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          subscription.update_status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          subscription.update_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {subscription.update_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Replace settings view with profile view
  const renderProfileView = () => {
    if (isProfileLoading) return <div className="flex items-center justify-center">Loading profile...</div>;
    if (!userProfile) return <div className="flex items-center justify-center">No profile found</div>;

    return (
      <div className="card p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
        
        {profileError && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-lg mb-6">
            {profileError}
          </div>
        )}

        <div className="space-y-6">
          {/* Microsoft Connection Status */}
          <div className="border-b border-gray-700 pb-6">
            <h3 className="font-medium mb-4">Microsoft Connection</h3>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${microsoftStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{microsoftStatus.isConnected ? 'Connected' : 'Not Connected'}</span>
              <button
                onClick={microsoftStatus.isConnected ? signOutFromMicrosoft : signInToMicrosoft}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {microsoftStatus.isConnected ? 'Disconnect' : 'Connect with Microsoft'}
              </button>
            </div>
          </div>

          {/* OneDrive Files */}
          {microsoftStatus.isConnected && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">OneDrive Excel Files</h3>
              <div className="border rounded-lg p-4">
                {excelFiles.length > 0 ? (
                  <ul className="space-y-2">
                    {excelFiles.map((file: any) => (
                      <li key={file.id} className="flex items-center justify-between">
                        <span>{file.name}</span>
                        <a
                          href={file.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Open in OneDrive
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No Excel files found in your OneDrive</p>
                )}
              </div>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={userProfile.avatar_url || '/default-avatar.png'}
                alt={userProfile.display_name || 'Profile'}
                className="w-20 h-20 rounded-full object-cover"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-purple-500 p-1 rounded-full cursor-pointer hover:bg-purple-600 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h3 className="font-medium">Profile Picture</h3>
              <p className="text-sm text-gray-400">Click the plus icon to upload a new photo</p>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={userProfile.display_name}
              onChange={(e) => handleProfileUpdate({ display_name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500"
              placeholder="Enter your display name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email Address</label>
            <input
              type="email"
              value={userProfile.email}
              onChange={(e) => handleProfileUpdate({ email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500"
              placeholder="Enter your email"
            />
          </div>

          <div className="pt-4">
            <p className="text-sm text-gray-400">
              Last updated: {formatDate(userProfile.updated_at)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      setIsProfileLoading(true);
      const profile = await getUserProfile(user.id);
      setUserProfile(profile || {
        user_id: user.id,
        display_name: '',
        email: user.email || '',
        avatar_url: null,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setIsProfileLoading(false);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;
    
    try {
      setIsProfileLoading(true);
      setProfileError(null);
      const file = event.target.files[0];
      const avatarUrl = await uploadAvatar(user.id, file);
      setUserProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setProfileError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsProfileLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">Error: {error}</div>;

  const monthlyClients = subscriptions.filter(s => s.frequency === 'monthly').length;
  const quarterlyClients = subscriptions.filter(s => s.frequency === 'quarterly').length;
  const totalClients = monthlyClients + quarterlyClients;

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
              Analyses
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
              alt={userProfile.display_name}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar Card */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Maand Selectie</h2>
              <button
                onClick={() => setIsUpdatesModalOpen(true)}
                className="glass-button px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <span>Bekijk Updates</span>
                {getPendingUpdates().length > 0 && (
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs">
                    {getPendingUpdates().length}
                  </span>
                )}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {months.map((month, index) => {
                const counts = getMonthUpdatesCount(index);
                return (
                  <button
                    key={month}
                    className={`p-2 rounded-lg text-center relative ${
                      selectedMonth === index 
                        ? 'bg-purple-500 text-white' 
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedMonth(index)}
                  >
                    {/* Update Badges */}
                    <div className="absolute top-0.5 right-0.5 flex flex-col gap-1">
                      {/* Open Updates (Pending + Overdue) */}
                      {(counts.pending || 0) + (counts.overdue || 0) > 0 && (
                        <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 flex items-center justify-center" 
                              title={`${(counts.pending || 0) + (counts.overdue || 0)} open updates`}
                        >
                          {(counts.pending || 0) + (counts.overdue || 0)}
                        </span>
                      )}
                      {/* Completed Updates */}
                      {(counts.completed || 0) > 0 && (
                        <span className="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 flex items-center justify-center" 
                              title={`${counts.completed} completed updates`}
                        >
                          {counts.completed}
                        </span>
                      )}
                    </div>
                    <span>{month}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-4 gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded-full bg-yellow-500 flex items-center justify-center text-xs text-white">2</span>
                <span>Open Updates</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded-full bg-green-500 flex items-center justify-center text-xs text-white">1</span>
                <span>Completed</span>
              </div>
            </div>
          </div>

          {/* Client Distribution */}
          <div className="grid grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">Abonnementsverdeling</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Maandelijks</span>
                    <span className="text-sm text-purple-500">{Math.round(monthlyClients/totalClients*100)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(monthlyClients/totalClients*100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Per kwartaal</span>
                    <span className="text-sm text-yellow-500">{Math.round(quarterlyClients/totalClients*100)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(quarterlyClients/totalClients*100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-between text-sm text-gray-400">
                  <div>Totaal klanten: {totalClients}</div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span>{monthlyClients} Maandelijks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>{quarterlyClients} Per kwartaal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Updates Progress */}
            <div className="card p-6">
              <h2 
                className="text-lg font-semibold mb-6 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsUpdatesProgressCollapsed(!isUpdatesProgressCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <span>Updates Deze Maand</span>
                  <svg 
                    className={`w-5 h-5 transition-transform ${isUpdatesProgressCollapsed ? '-rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMonthsModalOpen(true);
                  }}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Bekijk Alle Maanden
                </button>
              </h2>
              <div className={`transition-all duration-300`}>
                <div className={`${isUpdatesProgressCollapsed ? 'space-y-4' : 'max-h-[400px] overflow-y-auto pr-2 space-y-4 custom-scrollbar'}`}>
                  {months.slice(
                    isUpdatesProgressCollapsed ? new Date().getMonth() : 0,
                    isUpdatesProgressCollapsed ? new Date().getMonth() + 2 : months.length
                  ).map((month, index) => {
                    const actualIndex = isUpdatesProgressCollapsed ? new Date().getMonth() + index : index;
                    const monthlySubscriptions = subscriptions.filter(s => {
                      const nextUpdate = s.next_update_due ? new Date(s.next_update_due) : null;
                      return nextUpdate && 
                             nextUpdate.getMonth() === actualIndex && 
                             s.frequency === 'monthly';
                    });

                    const quarterlySubscriptions = subscriptions.filter(s => {
                      const nextUpdate = s.next_update_due ? new Date(s.next_update_due) : null;
                      return nextUpdate && 
                             nextUpdate.getMonth() === actualIndex && 
                             s.frequency === 'quarterly';
                    });

                    const monthlyRequired = monthlySubscriptions.length;
                    const quarterlyRequired = quarterlySubscriptions.length;
                    const monthlyCompleted = monthlySubscriptions.filter(s => s.update_status === 'completed').length;
                    const quarterlyCompleted = quarterlySubscriptions.filter(s => s.update_status === 'completed').length;
                    const monthlyPercentage = monthlyRequired > 0 ? Math.round((monthlyCompleted / monthlyRequired) * 100) : 0;
                    const quarterlyPercentage = quarterlyRequired > 0 ? Math.round((quarterlyCompleted / quarterlyRequired) * 100) : 0;

                    return (
                      <div key={month} className="space-y-3">
                        <div className="text-sm text-gray-400 font-medium flex justify-between">
                          <span>{month}</span>
                          <span className="text-xs">
                            {monthlyRequired + quarterlyRequired} updates nodig
                          </span>
                        </div>
                        {/* Monthly Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                              Maandelijks ({monthlyCompleted}/{monthlyRequired})
                            </span>
                            <span className={`text-xs ${monthlyPercentage >= 70 ? 'text-green-500' : monthlyPercentage >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {monthlyPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                monthlyPercentage >= 70 ? 'bg-green-500' : 
                                monthlyPercentage >= 30 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${monthlyPercentage}%` }}
                            />
                          </div>
                        </div>
                        {/* Quarterly Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                              Kwartaal ({quarterlyCompleted}/{quarterlyRequired})
                            </span>
                            <span className={`text-xs ${quarterlyPercentage >= 70 ? 'text-green-500' : quarterlyPercentage >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {quarterlyPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                quarterlyPercentage >= 70 ? 'bg-green-500' : 
                                quarterlyPercentage >= 30 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${quarterlyPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Client Tables */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex flex-col gap-8">
              {/* Common Header with Search and Import */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Alle Klanten</h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Zoek klanten..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input px-4 py-2 rounded-lg"
                  />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="glass-button px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Importeer Excel
                  </label>
                  {selectedFile && (
                    <button
                      onClick={handleImport}
                      disabled={loading}
                      className="glass-button px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Uploaden
                    </button>
                  )}
                  {showRevertButton && (
                    <button
                      onClick={handleRevertImport}
                      disabled={loading || !previousSubscriptions}
                      className="glass-button px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
                      title="Herstel naar vorige import"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span>Herstel Import</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Monthly Clients Section */}
              <div className="card p-6 mb-6">
                <h3 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setIsMonthlyCollapsed(!isMonthlyCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>Maandelijkse Klanten ({filteredAndSortedSubscriptions.filter(s => s.frequency === 'monthly').length})</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 transition-transform ${isMonthlyCollapsed ? '-rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h3>
                <div className={`overflow-x-auto transition-all duration-300 ${isMonthlyCollapsed ? 'hidden' : 'block'}`}>
                  <table className="w-full">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('client_name')}
                        >
                          Klantnaam {sortField === 'client_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('wp_theme')}
                        >
                          WP Thema {sortField === 'wp_theme' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('php_version')}
                        >
                          PHP Versie {sortField === 'php_version' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('ga4_status')}
                        >
                          GA4 {sortField === 'ga4_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-3 text-gray-400">Analytics</th>
                        <th className="text-left py-3 text-gray-400">Laatste Update</th>
                        <th className="text-left py-3 text-gray-400">Volgende Update</th>
                        <th className="text-left py-3 text-gray-400">Status</th>
                        <th className="text-left py-3 text-gray-400">Opmerkingen</th>
                        <th className="text-left py-3 text-gray-400">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedSubscriptions
                        .filter(subscription => subscription.frequency === 'monthly')
                        .map((subscription) => (
                          <ClientRow 
                            key={subscription.id} 
                            subscription={subscription}
                            onEdit={handleEdit}
                            onDelete={deleteSubscription}
                            formatDate={formatDate}
                            user={user}
                            fetchSubscriptions={fetchSubscriptions}
                          />
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quarterly Clients Section */}
              <div className="card p-6">
                <h3 
                  className="text-lg font-semibold mb-4 flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setIsQuarterlyCollapsed(!isQuarterlyCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Kwartaal Klanten ({filteredAndSortedSubscriptions.filter(s => s.frequency === 'quarterly').length})</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 transition-transform ${isQuarterlyCollapsed ? '-rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h3>
                <div className={`overflow-x-auto transition-all duration-300 ${isQuarterlyCollapsed ? 'hidden' : 'block'}`}>
                  <table className="w-full">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('client_name')}
                        >
                          Klantnaam {sortField === 'client_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('wp_theme')}
                        >
                          WP Thema {sortField === 'wp_theme' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('php_version')}
                        >
                          PHP Versie {sortField === 'php_version' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 text-gray-400 cursor-pointer hover:text-white"
                          onClick={() => handleSort('ga4_status')}
                        >
                          GA4 {sortField === 'ga4_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-3 text-gray-400">Analytics</th>
                        <th className="text-left py-3 text-gray-400">Laatste Update</th>
                        <th className="text-left py-3 text-gray-400">Volgende Update</th>
                        <th className="text-left py-3 text-gray-400">Status</th>
                        <th className="text-left py-3 text-gray-400">Opmerkingen</th>
                        <th className="text-left py-3 text-gray-400">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedSubscriptions
                        .filter(subscription => subscription.frequency === 'quarterly')
                        .map((subscription) => (
                          <ClientRow 
                            key={subscription.id} 
                            subscription={subscription}
                            onEdit={handleEdit}
                            onDelete={deleteSubscription}
                            formatDate={formatDate}
                            user={user}
                            fetchSubscriptions={fetchSubscriptions}
                          />
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'analytics' && renderAnalyticsView()}

      {activeView === 'profile' && renderProfileView()}

      {/* Edit Modal */}
      {isEditModalOpen && editingSubscription && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Klant Bewerken</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex space-x-4 mb-4 border-b border-gray-600">
              <button
                type="button"
                className={`px-4 py-2 ${
                  activeTab === "general" 
                    ? "border-b-2 border-blue-500 text-blue-500" 
                    : "text-gray-400"
                }`}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
              <button
                type="button"
                className={`px-4 py-2 ${
                  activeTab === "hosting" 
                    ? "border-b-2 border-blue-500 text-blue-500" 
                    : "text-gray-400"
                }`}
                onClick={() => setActiveTab("hosting")}
              >
                Hosting Gegevens
              </button>
              <button
                type="button"
                className={`px-4 py-2 ${
                  activeTab === "database" 
                    ? "border-b-2 border-blue-500 text-blue-500" 
                    : "text-gray-400"
                }`}
                onClick={() => setActiveTab("database")}
              >
                Database
              </button>
            </div>

            {activeTab === "general" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Klantnaam</label>
                  <input
                    type="text"
                    value={editingSubscription.client_name}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      client_name: e.target.value
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Frequentie</label>
                  <select
                    value={editingSubscription.frequency}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      frequency: e.target.value as 'monthly' | 'quarterly'
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  >
                    <option value="monthly">Maandelijks</option>
                    <option value="quarterly">Per kwartaal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">WordPress Thema</label>
                  <input
                    type="text"
                    value={editingSubscription.wp_theme || ''}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      wp_theme: e.target.value
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">PHP Versie</label>
                  <input
                    type="text"
                    value={editingSubscription.php_version || ''}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      php_version: e.target.value
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">GA4 Status</label>
                  <select
                    value={editingSubscription.ga4_status}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      ga4_status: e.target.value as 'yes' | 'no' | 'pending'
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  >
                    <option value="yes">Ja</option>
                    <option value="pending">In behandeling</option>
                    <option value="no">Nee</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Analytics Check</label>
                  <select
                    value={editingSubscription.analytics_check ? 'true' : 'false'}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      analytics_check: e.target.value === 'true'
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  >
                    <option value="true">Ja</option>
                    <option value="false">Nee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Laatste Update</label>
                  <input
                    type="date"
                    value={editingSubscription.last_update ? new Date(editingSubscription.last_update).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingSubscription({
                      ...editingSubscription,
                      last_update: e.target.value ? new Date(e.target.value).toISOString() : null,
                      next_update_due: e.target.value ? 
                        calculateNextUpdate({...editingSubscription, last_update: e.target.value}).toISOString() : null
                    })}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Volgende Update</label>
                  <input
                    type="date"
                    value={editingSubscription.next_update_due ? new Date(editingSubscription.next_update_due).toISOString().split('T')[0] : ''}
                    disabled
                    className="glass-input w-full px-4 py-2 rounded-lg opacity-50"
                  />
                </div>

                {/* Comments Section */}
                <div className="col-span-2 mt-4">
                  <label className="block text-sm text-gray-400 mb-1">Opmerkingen</label>
                  <div className="space-y-2">
                    <textarea
                      value={editingSubscription.comments || ''}
                      onChange={(e) => setEditingSubscription({
                        ...editingSubscription,
                        comments: e.target.value
                      })}
                      className="glass-input w-full px-4 py-2 rounded-lg min-h-[100px] resize-y"
                      placeholder="Voeg hier je opmerkingen toe..."
                    />
                    {editingSubscription.comment_updated_by && editingSubscription.comment_updated_at && (
                      <p className="text-sm text-gray-400">
                        Laatste opmerking door {editingSubscription.comment_updated_by === user?.id ? 'jou' : 'een andere gebruiker'} op {formatDate(editingSubscription.comment_updated_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "hosting" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Host</label>
                  <input
                    type="text"
                    value={hostingDetails.host}
                    onChange={(e) => setHostingDetails(prev => ({ ...prev, host: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Gebruikersnaam</label>
                  <input
                    type="text"
                    value={hostingDetails.username}
                    onChange={(e) => setHostingDetails(prev => ({ ...prev, username: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Wachtwoord</label>
                  <input
                    type="password"
                    value={hostingDetails.password}
                    onChange={(e) => setHostingDetails(prev => ({ ...prev, password: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Poort</label>
                  <input
                    type="text"
                    value={hostingDetails.port}
                    onChange={(e) => setHostingDetails(prev => ({ ...prev, port: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
              </div>
            )}

            {activeTab === "database" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Host</label>
                  <input
                    type="text"
                    value={databaseDetails.host}
                    onChange={(e) => setDatabaseDetails(prev => ({ ...prev, host: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Database Name</label>
                  <input
                    type="text"
                    value={databaseDetails.databaseName}
                    onChange={(e) => setDatabaseDetails(prev => ({ ...prev, databaseName: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Database User</label>
                  <input
                    type="text"
                    value={databaseDetails.databaseUser}
                    onChange={(e) => setDatabaseDetails(prev => ({ ...prev, databaseUser: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={databaseDetails.password}
                    onChange={(e) => setDatabaseDetails(prev => ({ ...prev, password: e.target.value }))}
                    className="glass-input w-full px-4 py-2 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="glass-button px-4 py-2 rounded-lg"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="glass-button px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Wijzigingen Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updates Modal */}
      {isUpdatesModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Updates voor {months[selectedMonth]}
              </h2>
              <button
                onClick={() => setIsUpdatesModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {getPendingUpdates().length === 0 ? (
                <p className="text-gray-400">Geen updates nodig voor deze maand.</p>
              ) : (
                getPendingUpdates().map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{subscription.client_name}</h3>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-400">
                          Volgende update: {formatDate(subscription.next_update_due)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Type: {subscription.frequency === 'monthly' ? 'Maandelijks' : 'Kwartaal'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => markUpdateAsCompleted(subscription.id)}
                      className="glass-button px-4 py-2 rounded-lg text-sm hover:bg-green-500/20 hover:text-green-400 transition-colors"
                    >
                      Markeer als Voltooid
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Months Modal */}
      {isMonthsModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Updates Overzicht - Alle Maanden</h2>
              <button
                onClick={() => setIsMonthsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto flex-grow pr-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                {months.map((month, index) => {
                  const monthlySubscriptions = subscriptions.filter(s => {
                    const nextUpdate = s.next_update_due ? new Date(s.next_update_due) : null;
                    return nextUpdate && 
                           nextUpdate.getMonth() === index && 
                           s.frequency === 'monthly';
                  });

                  const quarterlySubscriptions = subscriptions.filter(s => {
                    const nextUpdate = s.next_update_due ? new Date(s.next_update_due) : null;
                    return nextUpdate && 
                           nextUpdate.getMonth() === index && 
                           s.frequency === 'quarterly';
                  });

                  const monthlyRequired = monthlySubscriptions.length;
                  const quarterlyRequired = quarterlySubscriptions.length;
                  const monthlyCompleted = monthlySubscriptions.filter(s => s.update_status === 'completed').length;
                  const quarterlyCompleted = quarterlySubscriptions.filter(s => s.update_status === 'completed').length;
                  const monthlyPercentage = monthlyRequired > 0 ? Math.round((monthlyCompleted / monthlyRequired) * 100) : 0;
                  const quarterlyPercentage = quarterlyRequired > 0 ? Math.round((quarterlyCompleted / quarterlyRequired) * 100) : 0;

                  return (
                    <div key={month} className="card p-4 space-y-3">
                      <div className="text-lg text-white font-medium flex justify-between items-center">
                        <span>{month}</span>
                        <span className="text-sm text-gray-400">
                          {monthlyRequired + quarterlyRequired} updates nodig
                        </span>
                      </div>
                      {/* Monthly Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            Maandelijks ({monthlyCompleted}/{monthlyRequired})
                          </span>
                          <span className={`text-xs ${monthlyPercentage >= 70 ? 'text-green-500' : monthlyPercentage >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {monthlyPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              monthlyPercentage >= 70 ? 'bg-green-500' : 
                              monthlyPercentage >= 30 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${monthlyPercentage}%` }}
                          />
                        </div>
                      </div>
                      {/* Quarterly Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">
                            Kwartaal ({quarterlyCompleted}/{quarterlyRequired})
                          </span>
                          <span className={`text-xs ${quarterlyPercentage >= 70 ? 'text-green-500' : quarterlyPercentage >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {quarterlyPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              quarterlyPercentage >= 70 ? 'bg-green-500' : 
                              quarterlyPercentage >= 30 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${quarterlyPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add the ClientRow component at the top of the file
type ClientRowProps = {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => Promise<void>;
  formatDate: (date: string | null) => string;
  user: User | null;
  fetchSubscriptions: () => Promise<void>;
};

const ClientRow = ({ subscription, onEdit, onDelete, formatDate, user, fetchSubscriptions }: ClientRowProps) => (
  <tr className="border-b border-gray-700 hover:bg-gray-800">
    <td className="py-3">{subscription.client_name}</td>
    <td className="py-3">{subscription.wp_theme || '-'}</td>
    <td className="py-3">{subscription.php_version || '-'}</td>
    <td className="py-3">
      <span className={`px-2 py-1 rounded-full text-xs ${
        subscription.ga4_status === 'yes' ? 'bg-green-500/20 text-green-400' :
        subscription.ga4_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-red-500/20 text-red-400'
      }`}>
        {subscription.ga4_status === 'yes' ? 'Ja' : 
         subscription.ga4_status === 'pending' ? 'In behandeling' : 'Nee'}
      </span>
    </td>
    <td className="py-3">
      {subscription.analytics_check ? 
        <span className="text-green-400">✓</span> : 
        <span className="text-red-400">×</span>
      }
    </td>
    <td className="py-3">{formatDate(subscription.last_update)}</td>
    <td className="py-3">{formatDate(subscription.next_update_due)}</td>
    <td className="py-3">
      <span className={`px-2 py-1 rounded-full text-xs ${
        subscription.update_status === 'completed' ? 'bg-green-500/20 text-green-400' :
        subscription.update_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-red-500/20 text-red-400'
      }`}>
        {subscription.update_status === 'completed' ? 'Voltooid' :
         subscription.update_status === 'pending' ? 'In behandeling' :
         subscription.update_status === 'overdue' ? 'Te laat' : 'In behandeling'}
      </span>
    </td>
    <td className="py-3">
      {subscription.comments ? (
        <div className="group relative">
          <span className="text-purple-400 cursor-help">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </span>
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block">
            <div className="bg-gray-800 text-sm p-2 rounded-lg shadow-lg max-w-xs">
              <p className="text-gray-300">{subscription.comments}</p>
              {subscription.comment_updated_by && subscription.comment_updated_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Bijgewerkt op {formatDate(subscription.comment_updated_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <span className="text-gray-500">-</span>
      )}
    </td>
    <td className="py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(subscription)}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          title="Bewerken"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={async () => {
            if (window.confirm('Weet je zeker dat je deze klant wilt verwijderen?')) {
              await onDelete(subscription.id);
              fetchSubscriptions();
            }
          }}
          className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-400/10 transition-colors"
          title="Verwijderen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </td>
  </tr>
);