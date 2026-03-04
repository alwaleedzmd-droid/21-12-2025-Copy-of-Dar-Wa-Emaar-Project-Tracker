-- ═══════════════════════════════════════════════════════════════════════
-- ملف ترحيل شامل: إضافة جميع الأعمدة المطلوبة لـ project_works
-- يشمل: الترميز (@handler)، تاريخ الإنجاز المتوقع، إسناد المهام
-- 
-- طريقة التشغيل:
-- 1. افتح لوحة Supabase → SQL Editor
-- 2. الصق محتوى هذا الملف بالكامل
-- 3. اضغط Run
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────
-- أعمدة ترميز الجهات (@handler)
-- ────────────────────────────────────

-- الجهة الحالية المرمَّز عليها (مثل: المالية، الشؤون القانونية)
ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS current_handler TEXT DEFAULT NULL;

-- تاريخ الترميز
ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS handler_tagged_at TIMESTAMPTZ DEFAULT NULL;

-- حالة الترميز: active = لا زال لدى الجهة، completed = تم الإنجاز
ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS handler_status TEXT DEFAULT NULL;

-- ────────────────────────────────────
-- عمود تاريخ الإنجاز المتوقع
-- ────────────────────────────────────

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS expected_completion_date DATE DEFAULT NULL;

-- ────────────────────────────────────
-- أعمدة إسناد المهام
-- ────────────────────────────────────

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL;

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT DEFAULT NULL;

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS assignment_description TEXT DEFAULT NULL;

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'pending';

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- ────────────────────────────────────
-- الفهارس (Indexes) للأداء
-- ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_project_works_handler_active
ON project_works (current_handler) WHERE handler_status = 'active';

CREATE INDEX IF NOT EXISTS idx_project_works_handler_status
ON project_works (handler_status) WHERE handler_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_works_expected_date
ON project_works (expected_completion_date) WHERE expected_completion_date IS NOT NULL AND status != 'completed';

CREATE INDEX IF NOT EXISTS idx_project_works_assigned_to
ON project_works (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_works_assignment_status
ON project_works (assignment_status) WHERE assignment_status IS NOT NULL;

-- ────────────────────────────────────
-- تحديث سياسة RLS للسماح بالأعمدة الجديدة
-- ────────────────────────────────────

-- السماح لـ anon بالقراءة والكتابة على project_works
DO $$
BEGIN
  -- التأكد من تمكين RLS
  ALTER TABLE project_works ENABLE ROW LEVEL SECURITY;
  
  -- إزالة السياسات القديمة إن وجدت
  DROP POLICY IF EXISTS "Allow all for anon on project_works" ON project_works;
  DROP POLICY IF EXISTS "project_works_anon_select" ON project_works;
  DROP POLICY IF EXISTS "project_works_anon_insert" ON project_works;
  DROP POLICY IF EXISTS "project_works_anon_update" ON project_works;
  
  -- إنشاء سياسات جديدة شاملة
  CREATE POLICY "project_works_anon_select" ON project_works FOR SELECT TO anon USING (true);
  CREATE POLICY "project_works_anon_insert" ON project_works FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "project_works_anon_update" ON project_works FOR UPDATE TO anon USING (true) WITH CHECK (true);
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'RLS policies may already exist: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- ✅ اكتمل التشغيل - الآن أعد تحميل التطبيق
-- ═══════════════════════════════════════════════════════════════════════
