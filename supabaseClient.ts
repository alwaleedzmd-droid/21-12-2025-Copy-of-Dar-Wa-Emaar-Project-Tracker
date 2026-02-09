import { createClient } from'@supabase/supabase-js';

/**
 * جلب القيم من import.meta.env (Vite) مع قيم احتياطية
 */
const fallbackUrl = 'https://xrjqfzjvhranyfvhnqap.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyanFmemp2aHJhbnlmdmhucWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNjYyNzIsImV4cCI6MjA4MTc0MjI3Mn0.uEvfc2YRIF4_98Oy_T9w09wPPQh0CbZPEuqfdaqpHz0';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidHttpUrl(rawSupabaseUrl) ? rawSupabaseUrl : fallbackUrl;
const supabaseAnonKey = rawSupabaseAnonKey || fallbackKey;

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length
});

/**
 * تصدير عميل Supabase مع خيارات auth محسنة
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'dar-wa-emaar-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
