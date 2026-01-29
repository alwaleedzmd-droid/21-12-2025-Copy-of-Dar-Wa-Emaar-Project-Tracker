
import { createClient } from '@supabase/supabase-js';

/**
 * محاولة جلب القيم من process.env (المستخدم في البيئات السحابية) 
 * أو import.meta.env (المستخدم افتراضياً في Vite)
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || 'https://xrjqfzjvhranyfvhnqap.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyanFmemp2aHJhbnlmdmhucWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNjYyNzIsImV4cCI6MjA4MTc0MjI3Mn0.uEvfc2YRIF4_98Oy_T9w09wPPQh0CbZPEuqfdaqpHz0';

if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn("⚠️ تنبيه: لم يتم العثور على VITE_SUPABASE_URL في متغيرات البيئة، تم استخدام القيمة الاحتياطية.");
}

/**
 * تصدير عميل Supabase.
 * تم وضع قيم افتراضية لضمان عدم تعطل الدالة الإنشائية (createClient) 
 * وتجنب خطأ "supabaseUrl is required".
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
