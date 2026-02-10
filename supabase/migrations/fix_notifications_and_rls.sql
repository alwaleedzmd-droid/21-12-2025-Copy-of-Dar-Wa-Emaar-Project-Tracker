-- ==================================================
-- إصلاح جدول الإشعارات وسياسات RLS
-- يجب تشغيل هذا في Supabase SQL Editor
-- ==================================================

-- 1. السماح بـ user_id فارغ في جدول الإشعارات (للإشعارات العامة)
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

-- 2. تفعيل الاشتراكات اللحظية (Real-time) على الجداول المهمة
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.technical_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deeds_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_works;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. سياسات RLS للسماح بالقراءة للمستخدمين المسجلين (anon + authenticated)
-- الإشعارات
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_notifications" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_insert_notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- المشاريع
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_all_projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

-- الطلبات الفنية
ALTER TABLE public.technical_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_technical_requests" ON public.technical_requests
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_all_technical_requests" ON public.technical_requests
  FOR ALL USING (true) WITH CHECK (true);

-- طلبات الإفراغ
ALTER TABLE public.deeds_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_deeds_requests" ON public.deeds_requests
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_all_deeds_requests" ON public.deeds_requests
  FOR ALL USING (true) WITH CHECK (true);

-- أعمال المشاريع
ALTER TABLE public.project_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_project_works" ON public.project_works
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_all_project_works" ON public.project_works
  FOR ALL USING (true) WITH CHECK (true);

-- الملفات الشخصية
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_all_profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- تعليقات الأعمال
ALTER TABLE public.work_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_work_comments" ON public.work_comments
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "allow_all_work_comments" ON public.work_comments
  FOR ALL USING (true) WITH CHECK (true);

-- أرشيف العملاء (لخاصية الإكمال التلقائي)
ALTER TABLE public.client_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_client_archive" ON public.client_archive
  FOR SELECT USING (true);
