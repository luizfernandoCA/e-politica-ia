import { createClient } from '@supabase/supabase-js';

// Read Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client (gracefully handle missing credentials for demo mode)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Health check status helper
export const isSupabaseConnected = () => {
  return !!supabase;
};

if (!supabase) {
  console.warn(
    'e-politica.ia [Aviso]: Credenciais do Supabase ausentes no arquivo .env. ' +
    'O aplicativo está rodando em modo DEMO OFFLINE com dados mockados de alta fidelidade.'
  );
}
