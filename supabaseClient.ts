
import { createClient } from '@supabase/supabase-js';

// Fix: Use process.env instead of import.meta.env to resolve TypeScript 'ImportMeta' property errors.
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// التحقق لضمان استقرار الواجهة
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ تنبيه: روابط سوبابيس مفقودة في محرر الكود.");
}

// إنشاء العميل فقط في حال توفر البيانات
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;
