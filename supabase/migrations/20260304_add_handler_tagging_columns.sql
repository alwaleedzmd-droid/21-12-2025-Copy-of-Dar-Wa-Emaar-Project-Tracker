-- ═══════════════════════════════════════════════════════════════
-- إضافة أعمدة ترميز الجهات (@mention) على أعمال المشاريع
-- عند كتابة تعليق يحتوي @المالية مثلاً، يتم تحديث الجهة الحالية
-- ═══════════════════════════════════════════════════════════════

-- الجهة الحالية المرمَّز عليها (مثل: المالية، الشؤون القانونية)
ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS current_handler TEXT DEFAULT NULL;

-- تاريخ الترميز
ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS handler_tagged_at TIMESTAMPTZ DEFAULT NULL;

-- حالة الترميز: active = لا زال لدى الجهة، completed = تم الإنجاز/العودة
ALTER TABLE project_works
ADD COLUMN IF NOT EXISTS handler_status TEXT DEFAULT NULL
CHECK (handler_status IN ('active', 'completed'));

-- فهرس للبحث السريع عن الأعمال المُرمَّزة النشطة
CREATE INDEX IF NOT EXISTS idx_project_works_handler_active
ON project_works (current_handler) WHERE handler_status = 'active';

-- فهرس لحالة الترميز
CREATE INDEX IF NOT EXISTS idx_project_works_handler_status
ON project_works (handler_status) WHERE handler_status IS NOT NULL;
