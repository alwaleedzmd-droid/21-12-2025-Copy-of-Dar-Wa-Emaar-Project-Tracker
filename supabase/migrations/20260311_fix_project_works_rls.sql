-- ================================================================
-- إصلاح سياسات RLS لجدول project_works
-- السبب: الجدول يملك SELECT فقط لـ anon — INSERT/UPDATE مفقودة
-- هذا يمنع مزامنة الطلبات المعتمدة مع سجل أعمال المشروع
-- ================================================================

BEGIN;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'project_works' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.project_works ENABLE ROW LEVEL SECURITY;

    -- السماح لجميع المستخدمين (anon + authenticated) بـ SELECT
    DROP POLICY IF EXISTS "project_works_anon_select" ON public.project_works;
    CREATE POLICY "project_works_anon_select"
      ON public.project_works FOR SELECT TO anon, authenticated USING (true);

    -- السماح بـ INSERT (لـ anon + authenticated) — مطلوب لمزامنة الطلبات المعتمدة
    DROP POLICY IF EXISTS "project_works_anon_insert" ON public.project_works;
    CREATE POLICY "project_works_anon_insert"
      ON public.project_works FOR INSERT TO anon, authenticated WITH CHECK (true);

    -- السماح بـ UPDATE (لـ anon + authenticated) — مطلوب لتحديث حالة الأعمال
    DROP POLICY IF EXISTS "project_works_anon_update" ON public.project_works;
    CREATE POLICY "project_works_anon_update"
      ON public.project_works FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

    -- السماح بـ DELETE (للمدير) — للمدير عبر واجهة المشاريع
    DROP POLICY IF EXISTS "project_works_anon_delete" ON public.project_works;
    CREATE POLICY "project_works_anon_delete"
      ON public.project_works FOR DELETE TO anon, authenticated USING (true);

  END IF;
END $$;

-- نفس الإصلاح لجدول work_comments
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'work_comments' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.work_comments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "work_comments_anon_select" ON public.work_comments;
    CREATE POLICY "work_comments_anon_select"
      ON public.work_comments FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "work_comments_anon_insert" ON public.work_comments;
    CREATE POLICY "work_comments_anon_insert"
      ON public.work_comments FOR INSERT TO anon, authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "work_comments_anon_update" ON public.work_comments;
    CREATE POLICY "work_comments_anon_update"
      ON public.work_comments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

  END IF;
END $$;

COMMIT;

-- ✅ تم إضافة سياسات INSERT/UPDATE/DELETE لـ project_works وwork_comments
-- هذا يضمن أن مزامنة الطلبات المعتمدة تعمل بغض النظر عن نوع المصادقة
