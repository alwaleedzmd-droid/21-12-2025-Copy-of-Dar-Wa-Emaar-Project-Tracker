-- ==================================================
-- إصلاح شامل لسياسات RLS على جدول deeds_requests
-- يجب تشغيل هذا في Supabase SQL Editor
-- ==================================================

-- 1. حذف جميع السياسات القديمة على deeds_requests
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'deeds_requests' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.deeds_requests', pol.policyname);
    END LOOP;
END $$;

-- 2. التأكد من تفعيل RLS
ALTER TABLE public.deeds_requests ENABLE ROW LEVEL SECURITY;

-- 3. منح الصلاحيات الكاملة للأدوار
GRANT ALL ON public.deeds_requests TO anon;
GRANT ALL ON public.deeds_requests TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. إنشاء سياسات مفتوحة تسمح بجميع العمليات
CREATE POLICY "allow_select_deeds" ON public.deeds_requests
  FOR SELECT USING (true);

CREATE POLICY "allow_insert_deeds" ON public.deeds_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_update_deeds" ON public.deeds_requests
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_deeds" ON public.deeds_requests
  FOR DELETE USING (true);

-- ==================================================
-- نفس الإصلاح على deed_comments (إن وُجد)
-- ==================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deed_comments') THEN
        -- حذف السياسات القديمة
        DECLARE pol RECORD;
        BEGIN
            FOR pol IN 
                SELECT policyname FROM pg_policies WHERE tablename = 'deed_comments' AND schemaname = 'public'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.deed_comments', pol.policyname);
            END LOOP;
        END;

        ALTER TABLE public.deed_comments ENABLE ROW LEVEL SECURITY;
        
        GRANT ALL ON public.deed_comments TO anon;
        GRANT ALL ON public.deed_comments TO authenticated;

        CREATE POLICY "allow_select_deed_comments" ON public.deed_comments FOR SELECT USING (true);
        CREATE POLICY "allow_insert_deed_comments" ON public.deed_comments FOR INSERT WITH CHECK (true);
        CREATE POLICY "allow_update_deed_comments" ON public.deed_comments FOR UPDATE USING (true) WITH CHECK (true);
        CREATE POLICY "allow_delete_deed_comments" ON public.deed_comments FOR DELETE USING (true);
    END IF;
END $$;

-- ==================================================
-- إصلاح RLS على باقي الجداول المهمة 
-- ==================================================

-- notifications
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname); END LOOP;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO authenticated;
CREATE POLICY "allow_select_notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "allow_insert_notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_notifications" ON public.notifications FOR DELETE USING (true);

-- projects
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname); END LOOP;
END $$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;
CREATE POLICY "allow_select_projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "allow_insert_projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_projects" ON public.projects FOR DELETE USING (true);

-- technical_requests
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'technical_requests' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.technical_requests', pol.policyname); END LOOP;
END $$;

ALTER TABLE public.technical_requests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.technical_requests TO anon;
GRANT ALL ON public.technical_requests TO authenticated;
CREATE POLICY "allow_select_technical_requests" ON public.technical_requests FOR SELECT USING (true);
CREATE POLICY "allow_insert_technical_requests" ON public.technical_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_technical_requests" ON public.technical_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_technical_requests" ON public.technical_requests FOR DELETE USING (true);

-- project_works
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'project_works' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_works', pol.policyname); END LOOP;
END $$;

ALTER TABLE public.project_works ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.project_works TO anon;
GRANT ALL ON public.project_works TO authenticated;
CREATE POLICY "allow_select_project_works" ON public.project_works FOR SELECT USING (true);
CREATE POLICY "allow_insert_project_works" ON public.project_works FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_project_works" ON public.project_works FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_project_works" ON public.project_works FOR DELETE USING (true);

-- profiles
DO $$ 
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
CREATE POLICY "allow_select_profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "allow_insert_profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_profiles" ON public.profiles FOR DELETE USING (true);

-- client_archive
DO $$ 
DECLARE pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_archive') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'client_archive' AND schemaname = 'public'
        LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_archive', pol.policyname); END LOOP;
        
        ALTER TABLE public.client_archive ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON public.client_archive TO anon;
        GRANT ALL ON public.client_archive TO authenticated;
        CREATE POLICY "allow_select_client_archive" ON public.client_archive FOR SELECT USING (true);
        CREATE POLICY "allow_insert_client_archive" ON public.client_archive FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- work_comments
DO $$ 
DECLARE pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_comments') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'work_comments' AND schemaname = 'public'
        LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.work_comments', pol.policyname); END LOOP;
        
        ALTER TABLE public.work_comments ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON public.work_comments TO anon;
        GRANT ALL ON public.work_comments TO authenticated;
        CREATE POLICY "allow_select_work_comments" ON public.work_comments FOR SELECT USING (true);
        CREATE POLICY "allow_insert_work_comments" ON public.work_comments FOR INSERT WITH CHECK (true);
        CREATE POLICY "allow_update_work_comments" ON public.work_comments FOR UPDATE USING (true) WITH CHECK (true);
        CREATE POLICY "allow_delete_work_comments" ON public.work_comments FOR DELETE USING (true);
    END IF;
END $$;
