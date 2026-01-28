
import { createClient } from '@supabase/supabase-js';

// استخدام process.env للوصول إلى متغيرات البيئة في هذه البيئة
const supabaseUrl = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || '';
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || '';

// التحقق من وجود المفاتيح لضمان عدم حدوث خطأ عند تهيئة العميل
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("تنبيه: روابط Supabase غير معرفة في متغيرات البيئة، قد لا يعمل الاتصال بقاعدة البيانات بشكل صحيح.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
