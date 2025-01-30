'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile, uploadAvatar } from '@/utils/supabase';
import OneDriveFilePicker from '@/components/OneDriveFilePicker';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile(user!.id);
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
        
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <p className="text-white">{user?.email}</p>
            </div>
            {profile && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <p className="text-white">{profile.display_name || 'Not set'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Import Data</h2>
          <div className="space-y-4">
            <p className="text-gray-400 mb-4">
              Import client data from OneDrive Excel files. Make sure your Excel file follows the required format.
            </p>
            <OneDriveFilePicker />
          </div>
        </div>
      </div>
    </div>
  );
} 