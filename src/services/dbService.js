import { supabase } from '../supabase';

/**
 * dbService - persists per-user application state in Supabase (table: user_state),
 * protected by Row Level Security (each user only reads/writes their own row).
 *
 * Replaces the previous Firebase Firestore + localStorage demo implementation.
 * localStorage is kept only as a resilience cache for offline scenarios.
 */

async function getStateRow(userId) {
  const { data, error } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertStateColumn(userId, column, value) {
  const { error } = await supabase
    .from('user_state')
    .upsert(
      { user_id: userId, [column]: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage unavailable */ }
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------------
// Campaign parameters
// -------------------------------------------------------------------------
export async function saveCampaignParams(userId, params) {
  if (!userId) return;
  cacheSet(`campaignParams_${userId}`, params);
  cacheSet('campaignParams', params); // legacy key still read by some pages
  try {
    await upsertStateColumn(userId, 'campaign_params', params);
  } catch (error) {
    console.error('[dbService] saveCampaignParams:', error.message);
  }
}

export async function getCampaignParams(userId) {
  if (!userId) return null;
  try {
    const row = await getStateRow(userId);
    if (row?.campaign_params) {
      cacheSet('campaignParams', row.campaign_params);
      return row.campaign_params;
    }
    return null;
  } catch (error) {
    console.error('[dbService] getCampaignParams:', error.message);
    return cacheGet(`campaignParams_${userId}`);
  }
}

// -------------------------------------------------------------------------
// Campaign checklist tasks
// -------------------------------------------------------------------------
export async function saveTasks(userId, tasks) {
  if (!userId) return;
  cacheSet(`campaignTasks_${userId}`, tasks);
  try {
    await upsertStateColumn(userId, 'tasks', tasks);
  } catch (error) {
    console.error('[dbService] saveTasks:', error.message);
  }
}

export async function getTasks(userId) {
  if (!userId) return null;
  try {
    const row = await getStateRow(userId);
    return row?.tasks ?? null;
  } catch (error) {
    console.error('[dbService] getTasks:', error.message);
    return cacheGet(`campaignTasks_${userId}`);
  }
}

// -------------------------------------------------------------------------
// CRM contacts
// -------------------------------------------------------------------------
export async function saveContacts(userId, contacts) {
  if (!userId) return;
  cacheSet(`crmContacts_${userId}`, contacts);
  try {
    await upsertStateColumn(userId, 'contacts', contacts);
  } catch (error) {
    console.error('[dbService] saveContacts:', error.message);
  }
}

export async function getContacts(userId) {
  if (!userId) return null;
  try {
    const row = await getStateRow(userId);
    return row?.contacts ?? null;
  } catch (error) {
    console.error('[dbService] getContacts:', error.message);
    return cacheGet(`crmContacts_${userId}`);
  }
}

// -------------------------------------------------------------------------
// Subscription / payment status
// -------------------------------------------------------------------------
export async function savePaymentStatus(userId, status) {
  if (!userId) return;
  cacheSet(`paymentStatus_${userId}`, status);
  try {
    await upsertStateColumn(userId, 'payment_status', status);
  } catch (error) {
    console.error('[dbService] savePaymentStatus:', error.message);
  }
}

export async function getPaymentStatus(userId) {
  if (!userId) return null;
  try {
    const row = await getStateRow(userId);
    return row?.payment_status ?? null;
  } catch (error) {
    console.error('[dbService] getPaymentStatus:', error.message);
    return cacheGet(`paymentStatus_${userId}`);
  }
}
