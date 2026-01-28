import { createClient } from '@supabase/supabase-js';

// جلب القيم مع التأكد من وجودها
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// الحل: إذا لم تتوفر الروابط، لا نترك القيمة null بل ننشئ تنبيهاً واضحاً
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { auth: {}, from: () => ({ select: () => ({ order: () => ({}) }) }) } as any; 

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ روابط سوبابيس غير معرفة بعد في هذه البيئة.");
}