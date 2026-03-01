-- ═══════════════════════════════════════════════════════════
-- إصلاح سياسات RLS للجداول الأساسية - إضافة وصول anon
-- التاريخ: 1 مارس 2026
-- السبب: السماح بالعمل عند تعطل Supabase Auth
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════ profiles ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "profiles_anon_select" ON public.profiles;
    CREATE POLICY "profiles_anon_select"
      ON public.profiles FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "profiles_anon_update" ON public.profiles;
    CREATE POLICY "profiles_anon_update"
      ON public.profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════ projects ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "projects_anon_select" ON public.projects;
    CREATE POLICY "projects_anon_select"
      ON public.projects FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ═══════════════ technical_requests ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'technical_requests' AND table_schema = 'public') THEN
    ALTER TABLE public.technical_requests ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "technical_requests_anon_select" ON public.technical_requests;
    CREATE POLICY "technical_requests_anon_select"
      ON public.technical_requests FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "technical_requests_anon_all" ON public.technical_requests;
    CREATE POLICY "technical_requests_anon_all"
      ON public.technical_requests FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════ deeds_requests ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deeds_requests' AND table_schema = 'public') THEN
    ALTER TABLE public.deeds_requests ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "deeds_requests_anon_select" ON public.deeds_requests;
    CREATE POLICY "deeds_requests_anon_select"
      ON public.deeds_requests FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "deeds_requests_anon_all" ON public.deeds_requests;
    CREATE POLICY "deeds_requests_anon_all"
      ON public.deeds_requests FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════ project_works ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_works' AND table_schema = 'public') THEN
    ALTER TABLE public.project_works ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "project_works_anon_select" ON public.project_works;
    CREATE POLICY "project_works_anon_select"
      ON public.project_works FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ═══════════════ notifications ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "notifications_anon_select" ON public.notifications;
    CREATE POLICY "notifications_anon_select"
      ON public.notifications FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "notifications_anon_insert" ON public.notifications;
    CREATE POLICY "notifications_anon_insert"
      ON public.notifications FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════ request_comments ═══════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'request_comments' AND table_schema = 'public') THEN
    ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "request_comments_anon_select" ON public.request_comments;
    CREATE POLICY "request_comments_anon_select"
      ON public.request_comments FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "request_comments_anon_insert" ON public.request_comments;
    CREATE POLICY "request_comments_anon_insert"
      ON public.request_comments FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ✅ تم إضافة سياسات anon للجداول الأساسية
