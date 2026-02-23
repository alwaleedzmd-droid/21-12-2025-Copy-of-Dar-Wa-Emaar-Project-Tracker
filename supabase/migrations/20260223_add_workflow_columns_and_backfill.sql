-- ==================================================
-- Workflow columns + backfill for Technical & Deeds
-- Date: 2026-02-23
-- ==================================================

BEGIN;

-- ══════════════════════════════════════
-- 1) technical_requests workflow columns
-- ══════════════════════════════════════
ALTER TABLE public.technical_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT,
  ADD COLUMN IF NOT EXISTS workflow_cc TEXT;

-- Backfill technical request_type and workflow fields
UPDATE public.technical_requests
SET
  request_type = COALESCE(request_type, 'TECHNICAL_SECTION'),
  assigned_to = COALESCE(assigned_to, 'صالح اليحيى'),
  workflow_cc = COALESCE(workflow_cc, 'الوليد الدوسري + مساعد العقيل + قسم PR + القسم الفني')
WHERE request_type IS NULL OR assigned_to IS NULL OR workflow_cc IS NULL;

-- ══════════════════════════════════════
-- 2) deeds_requests workflow columns
-- ══════════════════════════════════════
ALTER TABLE public.deeds_requests
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS request_type TEXT,
  ADD COLUMN IF NOT EXISTS workflow_cc TEXT;

-- Backfill deeds request_type first
UPDATE public.deeds_requests
SET request_type = COALESCE(request_type, 'DEED_CLEARANCE')
WHERE request_type IS NULL;

-- Backfill deeds assigned_to/workflow_cc based on request_type
UPDATE public.deeds_requests
SET
  assigned_to = CASE
    WHEN COALESCE(request_type, 'DEED_CLEARANCE') = 'METER_TRANSFER' THEN COALESCE(assigned_to, 'نورة المالكي')
    ELSE COALESCE(assigned_to, 'الوليد الدوسري')
  END,
  workflow_cc = CASE
    WHEN COALESCE(request_type, 'DEED_CLEARANCE') = 'METER_TRANSFER' THEN COALESCE(workflow_cc, 'مساعد العقيل + قسم CX')
    ELSE COALESCE(workflow_cc, 'مساعد العقيل + قسم CX')
  END
WHERE assigned_to IS NULL OR workflow_cc IS NULL;

-- ══════════════════════════════════════
-- 3) Helpful indexes for workflow filtering
-- ══════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_technical_requests_request_type ON public.technical_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_technical_requests_assigned_to ON public.technical_requests(assigned_to);

CREATE INDEX IF NOT EXISTS idx_deeds_requests_request_type ON public.deeds_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_deeds_requests_assigned_to ON public.deeds_requests(assigned_to);

COMMIT;

-- Force PostgREST schema cache refresh (Supabase API)
SELECT pg_notify('pgrst', 'reload schema');
