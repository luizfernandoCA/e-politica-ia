import { createClient } from '@supabase/supabase-js';

// Production Supabase project (e-politica-ia / sa-east-1).
// The publishable (anon) key is safe to expose client-side: all data access
// is protected by Row Level Security policies in the database.
const DEFAULT_SUPABASE_URL = 'https://tlnprjkiydiogrcsruxw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_RgTl4pl6flsr21DUvzeJkg_GIutzG7b';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const isSupabaseConnected = () => !!supabase;
