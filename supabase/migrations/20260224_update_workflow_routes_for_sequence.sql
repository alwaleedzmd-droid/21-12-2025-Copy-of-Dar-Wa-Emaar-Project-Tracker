-- ═══════════════════════════════════════════════════════════
-- تحديث جدول workflow_routes لدعم تسلسل الموافقات
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- 1️⃣ تحديث البيانات الموجودة لتحويل assigned_to إلى JSON array
UPDATE public.workflow_routes
SET assigned_to = '["ssalyahya@darwaemaar.com"]'
WHERE request_type = 'TECHNICAL_SECTION';

UPDATE public.workflow_routes
SET assigned_to = '["adaldawsari@darwaemaar.com"]',
    cc_list = 'malageel@darwaemaar.com'
WHERE request_type = 'DEED_CLEARANCE';

UPDATE public.workflow_routes
SET assigned_to = '["nalmalki@darwaemaar.com"]',
    cc_list = 'malageel@darwaemaar.com'
WHERE request_type = 'METER_TRANSFER';

-- 2️⃣ تحديث التعليقات
COMMENT ON COLUMN public.workflow_routes.assigned_to IS 'المسؤولين المباشرين (JSON array) - تسلسل الموافقات بالترتيب';
COMMENT ON COLUMN public.workflow_routes.cc_list IS 'قائمة النسخ (CC) - إيميلات مفصولة بفاصلة';

COMMIT;

-- ✅ تم تحديث workflow_routes لدعم تسلسل الموافقات
-- الآن assigned_to عبارة عن JSON array من الإيميلات بالترتيب
-- يمكنك إدارة التسلسل من الواجهة
