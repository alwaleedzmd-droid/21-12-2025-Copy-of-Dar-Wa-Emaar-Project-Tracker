-- ==================================================
-- إصلاح جدول الطلبات الفنية - إضافة الأعمدة الناقصة
-- يجب تشغيل هذا في Supabase SQL Editor
-- تاريخ: 2026-02-16
-- ==================================================

-- 1. التأكد من وجود جميع الأعمدة المطلوبة في جدول technical_requests
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'EXTERNAL';
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS reviewing_entity TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS requesting_entity TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.technical_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. التأكد من سياسات RLS تسمح بالإدراج والتعديل
ALTER TABLE public.technical_requests ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت وإعادة إنشائها
DROP POLICY IF EXISTS "allow_read_technical_requests" ON public.technical_requests;
DROP POLICY IF EXISTS "allow_all_technical_requests" ON public.technical_requests;
DROP POLICY IF EXISTS "allow_insert_technical_requests" ON public.technical_requests;
DROP POLICY IF EXISTS "allow_update_technical_requests" ON public.technical_requests;
DROP POLICY IF EXISTS "allow_delete_technical_requests" ON public.technical_requests;

-- سياسة القراءة للجميع
CREATE POLICY "allow_read_technical_requests" ON public.technical_requests
  FOR SELECT USING (true);

-- سياسة الإدراج للجميع
CREATE POLICY "allow_insert_technical_requests" ON public.technical_requests
  FOR INSERT WITH CHECK (true);

-- سياسة التحديث للجميع
CREATE POLICY "allow_update_technical_requests" ON public.technical_requests
  FOR UPDATE USING (true) WITH CHECK (true);

-- سياسة الحذف للجميع
CREATE POLICY "allow_delete_technical_requests" ON public.technical_requests
  FOR DELETE USING (true);

-- 3. منح الصلاحيات
GRANT ALL ON public.technical_requests TO anon;
GRANT ALL ON public.technical_requests TO authenticated;
GRANT ALL ON public.technical_requests TO service_role;
