import { createClient } from '@supabase/supabase-js';

// استدعاء الروابط من متغيرات البيئة بدلاً من كتابتها يدوياً
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من وجود المفاتيح لضمان عدم حدوث خطأ
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("خطأ: مفاتيح سوبابيس غير موجودة في إعدادات Vercel!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});