-- ═══════════════════════════════════════════════════════════════
-- إضافة عمود تاريخ الإنجاز المتوقع لأعمال المشاريع
-- يتيح تسجيل التاريخ عند إضافة العمل أو تعديله لاحقاً
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS expected_completion_date DATE DEFAULT NULL;

-- فهرس للأعمال غير المنجزة حسب تاريخ الإنجاز المتوقع
CREATE INDEX IF NOT EXISTS idx_project_works_expected_date
ON project_works (expected_completion_date) WHERE expected_completion_date IS NOT NULL AND status != 'completed';
