import { createClient } from '@supabase/supabase-js';

// استخدام الرمز ? لضمان عدم الانهيار إذا كانت البيئة غير معرفة
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// التحقق لضمان استقرار الواجهة
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ تنبيه: روابط سوبابيس مفقودة في محرر الكود.");
}

// إنشاء العميل فقط في حال توفر البيانات
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;