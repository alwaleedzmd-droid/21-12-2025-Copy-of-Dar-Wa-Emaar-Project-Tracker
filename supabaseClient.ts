import { createClient } from '@supabase/supabase-js';

// 1. رابط المشروع (Project URL) ومفتاح الوصول (Anon Key)
// تم وضع القيم داخل علامات تنصيص لإصلاح خطأ Syntax/ReferenceError
const supabaseUrl = 'https://xrjqfzjvhranyfvhnqap.supabase.co'; 

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyanFmemp2aHJhbnlmdmhucWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNjYyNzIsImV4cCI6MjA4MTc0MjI3Mn0.uEvfc2YRIF4_98Oy_T9w09wPPQh0CbZPEuqfdaqpHz0'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
