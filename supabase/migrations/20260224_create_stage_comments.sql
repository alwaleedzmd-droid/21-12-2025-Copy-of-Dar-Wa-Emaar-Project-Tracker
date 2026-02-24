-- ═══════════════════════════════════════════════════════════
-- جدول تعليقات المراحل مع دعم كامل
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- إضافة عمود for لتعليقات المراحل إذا لم يكن موجوداً
-- هذا الجدول يربط التعليقات بمراحل معينة
ALTER TABLE public.workflow_stage_comments
  ADD COLUMN IF NOT EXISTS created_by_email TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- إنشاء فهرس إضافي للأداء
CREATE INDEX IF NOT EXISTS idx_stage_comments_user ON public.workflow_stage_comments(user_email);
CREATE INDEX IF NOT EXISTS idx_stage_comments_created ON public.workflow_stage_comments(created_at DESC);

-- Row Level Security لـ workflow_stage_comments
ALTER TABLE public.workflow_stage_comments ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة والجديدة (للتأكد من التشغيل المتكرر)
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "stage_comments_read" ON public.workflow_stage_comments;
DROP POLICY IF EXISTS "stage_comments_insert" ON public.workflow_stage_comments;

-- إنشاء سياسات جديدة
CREATE POLICY "stage_comments_read"
  ON public.workflow_stage_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stage_comments_insert"
  ON public.workflow_stage_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إضافة trigger للتحديث التلقائي للـ stage progress عند إضافة تعليق
CREATE OR REPLACE FUNCTION public.update_stage_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث updated_at إذا كان محدثاً
  UPDATE public.workflow_stage_progress
  SET updated_at = NOW()
  WHERE id = NEW.stage_progress_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stage_on_comment ON public.workflow_stage_comments;
CREATE TRIGGER trg_update_stage_on_comment
  AFTER INSERT ON public.workflow_stage_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stage_on_comment();

COMMIT;

-- ✅ تم تحسين نظام تعليقات المراحل
