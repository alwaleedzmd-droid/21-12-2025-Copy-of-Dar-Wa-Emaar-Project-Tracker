import { createClient } from'@supabase/supabase-js';

/**
 * جلب القيم من import.meta.env (Vite) مع قيم احتياطية
 */
const fallbackUrl = 'https://xrjqfzjvhranyfvhnqap.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyanFmemp2aHJhbnlmdmhucWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNjYyNzIsImV4cCI6MjA4MTc0MjI3Mn0.uEvfc2YRIF4_98Oy_T9w09wPPQh0CbZPEuqfdaqpHz0';

/**
 * تنظيف القيم: إزالة المسافات، علامات = الزائدة، وعلامات التنصيص
 */
const cleanEnvValue = (value: string): string => {
  return value
    .trim()
    .replace(/^["']+|["']+$/g, '')  // إزالة علامات التنصيص
    .replace(/^=+/, '')              // إزالة = في البداية
    .trim();
};

const rawSupabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL ?? '');
const rawSupabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '');

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * التحقق من أن المفتاح يبدو كـ JWT صالح (يبدأ بـ eyJ)
 */
const isValidJWT = (key: string): boolean => {
  return key.startsWith('eyJ') && key.includes('.') && key.split('.').length === 3;
};

const supabaseUrl = isValidHttpUrl(rawSupabaseUrl) ? rawSupabaseUrl : fallbackUrl;
const supabaseAnonKey = (rawSupabaseAnonKey && isValidJWT(rawSupabaseAnonKey)) ? rawSupabaseAnonKey : fallbackKey;

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length,
  keyPrefix: supabaseAnonKey.substring(0, 10) + '...',
  usingFallback: supabaseAnonKey === fallbackKey
});

/**
 * تصدير عميل Supabase مع خيارات auth محسنة
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // تعطيل detection من URL لمنع popup passwords
    storageKey: 'dar-wa-emaar-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
