import { supabase } from '../supabase';

/**
 * authService - real authentication backed by Supabase Auth.
 * Replaces the previous Firebase demo/sandbox implementation.
 */

export const VIP_EMAILS = ['webcamargo@gmail.com', 'sergio.augusto.olv@gmail.com'];

/** Maps a Supabase user to the app's internal user object shape. */
export function mapUser(user) {
  if (!user) return null;
  const email = (user.email || '').toLowerCase();
  const meta = user.user_metadata || {};
  const isVip = VIP_EMAILS.includes(email);
  return {
    uid: user.id,
    name:
      meta.name ||
      meta.full_name ||
      (email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Usuário'),
    email,
    avatar: meta.avatar_url ? null : '👤',
    photoURL: meta.avatar_url || null,
    title: isVip
      ? (email.includes('webcamargo') ? 'Gestor de Campanha' : 'Especialista Eleitoral e Assessor Parlamentar')
      : 'Assinante'
  };
}

export function isVipEmail(email) {
  return VIP_EMAILS.includes((email || '').toLowerCase());
}

/** Email + password sign up. May require e-mail confirmation depending on project settings. */
export async function signUpWithEmail(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  if (error) throw error;
  return {
    user: mapUser(data.user),
    session: data.session,
    needsEmailConfirmation: !data.session
  };
}

/** Email + password sign in. */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: mapUser(data.user), session: data.session };
}

/**
 * Google OAuth via Supabase. Requires the Google provider to be enabled in
 * the Supabase Dashboard (Authentication > Providers > Google).
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

/** Subscribes to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? mapUser(session.user) : null, session);
  });
  return () => data.subscription.unsubscribe();
}
