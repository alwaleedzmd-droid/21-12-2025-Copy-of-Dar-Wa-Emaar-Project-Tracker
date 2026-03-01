-- ═══════════════════════════════════════════════════════════
-- إصلاح سياسات RLS لجداول سير العمل - إضافة وصول anon
-- التاريخ: 1 مارس 2026
-- السبب: Supabase Auth معطل، المستخدمون يتصلون بدور anon
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════ workflow_routes ═══════════════
ALTER TABLE public.workflow_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_routes_select_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_insert_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_update_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_delete_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_anon_select" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_anon_all" ON public.workflow_routes;

-- السماح بالقراءة والكتابة لجميع المستخدمين (authenticated + anon)
CREATE POLICY "workflow_routes_select_all"
  ON public.workflow_routes FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "workflow_routes_insert_all"
  ON public.workflow_routes FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "workflow_routes_update_all"
  ON public.workflow_routes FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "workflow_routes_delete_all"
  ON public.workflow_routes FOR DELETE TO authenticated, anon USING (true);

-- ═══════════════ workflow_stages ═══════════════
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_stages_select_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_insert_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_update_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_delete_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_stages;
DROP POLICY IF EXISTS "Enable all for admins" ON public.workflow_stages;

CREATE POLICY "workflow_stages_select_all"
  ON public.workflow_stages FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "workflow_stages_insert_all"
  ON public.workflow_stages FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "workflow_stages_update_all"
  ON public.workflow_stages FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "workflow_stages_delete_all"
  ON public.workflow_stages FOR DELETE TO authenticated, anon USING (true);

-- ═══════════════ workflow_stage_progress ═══════════════
ALTER TABLE public.workflow_stage_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_stage_progress_select_all" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "workflow_stage_progress_insert_all" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "workflow_stage_progress_update_all" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.workflow_stage_progress;

CREATE POLICY "workflow_stage_progress_select_all"
  ON public.workflow_stage_progress FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "workflow_stage_progress_insert_all"
  ON public.workflow_stage_progress FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "workflow_stage_progress_update_all"
  ON public.workflow_stage_progress FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- ═══════════════ workflow_stage_comments ═══════════════
ALTER TABLE public.workflow_stage_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_stage_comments_select_all" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "workflow_stage_comments_insert_all" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "stage_comments_read" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "stage_comments_insert" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_comments;

CREATE POLICY "workflow_stage_comments_select_all"
  ON public.workflow_stage_comments FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "workflow_stage_comments_insert_all"
  ON public.workflow_stage_comments FOR INSERT TO authenticated, anon WITH CHECK (true);

COMMIT;

-- ✅ تم إصلاح سياسات RLS - الآن يمكن الوصول بدور anon و authenticated
