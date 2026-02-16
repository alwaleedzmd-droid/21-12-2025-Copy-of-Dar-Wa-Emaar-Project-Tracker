-- ==================================================
-- إصلاح جدول الطلبات الفنية + جدول الإشعارات
-- يجب تشغيل هذا في Supabase SQL Editor
-- تاريخ: 2026-02-16
-- ==================================================

-- ══════════════════════════════════════
-- 1. إصلاح جدول الإشعارات (notifications)
-- ══════════════════════════════════════
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

-- سياسات RLS للإشعارات
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "allow_all_notifications" ON public.notifications;

CREATE POLICY "allow_read_notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "allow_insert_notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO authenticated;

-- ══════════════════════════════════════
-- 2. إصلاح جدول الطلبات الفنية
-- ══════════════════════════════════════
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
