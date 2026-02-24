-- ═══════════════════════════════════════════════════════════
-- Fix RLS for workflow tables (authenticated only - production mode)
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.workflow_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_comments ENABLE ROW LEVEL SECURITY;

-- Cleanup workflow_routes policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_routes;
DROP POLICY IF EXISTS "Enable all for admins" ON public.workflow_routes;
DROP POLICY IF EXISTS "Enable insert for system" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_select_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_all_for_admins" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_temp_insert" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_insert_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_update_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_delete_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_select_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_insert_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_update_all" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_delete_all" ON public.workflow_routes;

CREATE POLICY "workflow_routes_select_all"
  ON public.workflow_routes FOR SELECT TO authenticated USING (true);

CREATE POLICY "workflow_routes_insert_all"
  ON public.workflow_routes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "workflow_routes_update_all"
  ON public.workflow_routes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "workflow_routes_delete_all"
  ON public.workflow_routes FOR DELETE TO authenticated USING (true);

-- Cleanup workflow_stages policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_stages;
DROP POLICY IF EXISTS "Enable all for admins" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_select_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_insert_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_update_all" ON public.workflow_stages;
DROP POLICY IF EXISTS "workflow_stages_delete_all" ON public.workflow_stages;

CREATE POLICY "workflow_stages_select_all"
  ON public.workflow_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "workflow_stages_insert_all"
  ON public.workflow_stages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "workflow_stages_update_all"
  ON public.workflow_stages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "workflow_stages_delete_all"
  ON public.workflow_stages FOR DELETE TO authenticated USING (true);

-- Cleanup workflow_stage_progress policies
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "workflow_stage_progress_select_all" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "workflow_stage_progress_insert_all" ON public.workflow_stage_progress;
DROP POLICY IF EXISTS "workflow_stage_progress_update_all" ON public.workflow_stage_progress;

CREATE POLICY "workflow_stage_progress_select_all"
  ON public.workflow_stage_progress FOR SELECT TO authenticated USING (true);

CREATE POLICY "workflow_stage_progress_insert_all"
  ON public.workflow_stage_progress FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "workflow_stage_progress_update_all"
  ON public.workflow_stage_progress FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Cleanup workflow_stage_comments policies
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "stage_comments_read" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "stage_comments_insert" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "workflow_stage_comments_select_all" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "workflow_stage_comments_insert_all" ON public.workflow_stage_comments;

CREATE POLICY "workflow_stage_comments_select_all"
  ON public.workflow_stage_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "workflow_stage_comments_insert_all"
  ON public.workflow_stage_comments FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;

-- ✅ Run this migration in Supabase SQL Editor to enforce production auth-only access
