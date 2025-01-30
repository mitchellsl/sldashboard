import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SubscriptionFrequency = 'monthly' | 'quarterly' | 'yearly';
export type GA4Status = 'yes' | 'yes - basic' | 'no' | 'pending';

// Mapping for Dutch frequency values
const frequencyMapping: { [key: string]: SubscriptionFrequency } = {
  'maandelijks': 'monthly',
  'per maand': 'monthly',
  'monthly': 'monthly',
  'kwartaal': 'quarterly',
  'per kwartaal': 'quarterly',
  'quarterly': 'quarterly',
  'jaarlijks': 'yearly',
  'per jaar': 'yearly',
  'yearly': 'yearly'
};

// Mapping for GA4 status values
const ga4StatusMapping: { [key: string]: GA4Status } = {
  'ja': 'yes',
  'yes': 'yes',
  'ja - basic': 'yes - basic',
  'yes - basic': 'yes - basic',
  'nee': 'no',
  'no': 'no',
  'in behandeling': 'pending',
  'pending': 'pending'
};

export interface Subscription {
  id: string;
  client_name: string;
  frequency: 'monthly' | 'quarterly';
  wp_theme?: string;
  php_version?: string;
  ga4_status: 'yes' | 'no' | 'pending';
  analytics_check: boolean;
  last_update: string | null;
  next_update_due: string | null;
  comments?: string;
  comment_updated_at?: string;
  comment_updated_by?: string;
  update_status?: 'completed' | 'pending' | 'overdue';
  updated_by?: string | null;
  hosting_details?: {
    host: string;
    username: string;
    password: string;
    port: string;
  } | null;
  database_details?: {
    host: string;
    databaseName: string;
    databaseUser: string;
    password: string;
  } | null;
}

export type UserProfile = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  updated_at: string;
};

function normalizeFrequency(value: string): SubscriptionFrequency {
  const normalized = value?.toLowerCase().trim();
  return frequencyMapping[normalized] || 'monthly';
}

function normalizeGA4Status(value: string): GA4Status {
  const normalized = value?.toLowerCase().trim();
  return ga4StatusMapping[normalized] || 'no';
}

function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || 
           normalized === 'yes' || 
           normalized === 'ja' || 
           normalized === '1' || 
           normalized === 'x' ||
           normalized === '✓' ||
           normalized === '✔';
  }
  return false;
}

export async function importExcelToSupabase(data: any[]): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .insert(data.map(row => ({
      client_name: row[0]?.trim() || 'Unknown Client',
      frequency: normalizeFrequency(row[1]),
      wp_theme: row[2]?.trim() || null,
      php_version: row[3]?.toString().trim() || null,
      ga4_status: normalizeGA4Status(row[4]),
      analytics_check: normalizeBoolean(row[5]),
      january: normalizeBoolean(row[6]),
      february: normalizeBoolean(row[7]),
      march: normalizeBoolean(row[8]),
      april: normalizeBoolean(row[9]),
      may: normalizeBoolean(row[10]),
      june: normalizeBoolean(row[11]),
      july: normalizeBoolean(row[12]),
      august: normalizeBoolean(row[13]),
      september: normalizeBoolean(row[14]),
      october: normalizeBoolean(row[15]),
      november: normalizeBoolean(row[16]),
      december: normalizeBoolean(row[17]),
      notes: row[18]?.toString().trim() || null
    })));

  if (error) throw error;
}

export async function getSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('client_name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateSubscription(id: string, updates: Partial<Subscription>) {
  // Remove id from updates
  const { id: _, ...updateData } = updates;

  // Convert hosting_details and database_details to JSONB if they exist
  const processedUpdates = {
    ...updateData,
    hosting_details: updateData.hosting_details ? JSON.stringify(updateData.hosting_details) : null,
    database_details: updateData.database_details ? JSON.stringify(updateData.database_details) : null,
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .update(processedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    throw error;
  }

  if (!data) {
    throw new Error('No data returned after update');
  }

  return data;
}

export async function deleteSubscription(id: string) {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  // First check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const profileData = {
    user_id: userId,
    ...(!existingProfile && {
      display_name: '',
      email: '',
      avatar_url: null,
    }),
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If profile doesn't exist, return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching profile:', error);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data;
}

export async function uploadAvatar(userId: string, file: File) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await updateUserProfile(userId, { avatar_url: publicUrl });

    return publicUrl;
  } catch (error) {
    console.error(`Error uploading avatar: ${error}`);
    throw new Error('Failed to upload avatar. Please try again.');
  }
}

export async function createSubscription(data: Omit<Subscription, 'id'>): Promise<Subscription> {
  const { data: newSubscription, error } = await supabase
    .from('subscriptions')
    .insert([{
      ...data,
      client_name: data.client_name.trim(),
      wp_theme: data.wp_theme?.trim() || null,
      php_version: data.php_version?.toString().trim() || null,
      last_update: data.last_update || null,
      next_update_due: data.next_update_due || null,
      comments: data.comments?.trim() || null
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }

  if (!newSubscription) {
    throw new Error('No data returned after creating subscription');
  }

  return newSubscription;
} 