import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance = null;

export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return supabaseInstance;
}

/* ── Auth Helpers ──────────────────────────────────────────────── */

export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile(userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserWithProfile() {
  const user = await getUser();
  if (!user) return { user: null, profile: null };

  const profile = await getProfile(user.id);
  return { user, profile };
}

export async function signIn(email, password) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email, password, metadata = {}) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

/* ── Role Helpers ──────────────────────────────────────────────── */

export function isCoach(profile) {
  return profile?.role === 'coach' || profile?.role === 'org_admin' || profile?.role === 'super_admin';
}

export function isGuardian(profile) {
  return profile?.role === 'guardian';
}

export function isAdmin(profile) {
  return profile?.role === 'org_admin' || profile?.role === 'super_admin';
}

export function getPortalPath(profile) {
  if (!profile) return '/login';
  if (isCoach(profile)) return '/coach/dashboard';
  if (isGuardian(profile)) return '/parent/dashboard';
  return '/login';
}

/* ── Position Helpers ──────────────────────────────────────────── */

const OFFENSE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEFENSE_POSITIONS = ['DL', 'LB', 'CB', 'S'];
const SPECIAL_POSITIONS = ['K', 'P', 'ATH'];

export function getPositionGroup(position) {
  if (OFFENSE_POSITIONS.includes(position)) return 'offense';
  if (DEFENSE_POSITIONS.includes(position)) return 'defense';
  if (SPECIAL_POSITIONS.includes(position)) return 'special';
  return 'special';
}

export function getPositionColor(position) {
  const group = getPositionGroup(position);
  switch (group) {
    case 'offense': return 'badge-offense';
    case 'defense': return 'badge-defense';
    case 'special': return 'badge-special';
    default: return 'badge-gold';
  }
}

export const POSITION_LABELS = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  OL: 'Offensive Line',
  DL: 'Defensive Line',
  LB: 'Linebacker',
  CB: 'Cornerback',
  S: 'Safety',
  K: 'Kicker',
  P: 'Punter',
  ATH: 'Athlete',
};

/* ── Age Division Helpers ──────────────────────────────────────── */

export const AGE_DIVISIONS = ['6U', '7U', '8U', '9U', '10U', '11U', '12U', '13U'];

export function getPlayerAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
