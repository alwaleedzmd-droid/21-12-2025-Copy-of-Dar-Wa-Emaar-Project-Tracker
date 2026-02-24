-- ═══════════════════════════════════════════════════════════
-- إضافة البيانات الافتراضية لجدول workflow_routes
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- حذف البيانات القديمة إن وجدت
DELETE FROM public.workflow_routes WHERE request_type IN ('TECHNICAL_SECTION', 'DEED_CLEARANCE', 'METER_TRANSFER');

-- إضافة البيانات الافتراضية بالإيميلات
INSERT INTO public.workflow_routes (request_type, request_type_label, assigned_to, cc_list, notify_roles, is_active)
VALUES 
  ('TECHNICAL_SECTION', 'طلب تقني', '["ssalyahya@darwaemaar.com"]', 'adaldawsari@darwaemaar.com, malageel@darwaemaar.com', 'ADMIN,PR_MANAGER,TECHNICAL', true),
  ('DEED_CLEARANCE', 'إفراغ/تصفية', '["adaldawsari@darwaemaar.com"]', 'malageel@darwaemaar.com', 'ADMIN,CONVEYANCE', true),
  ('METER_TRANSFER', 'نقل ملكية عداد', '["nalmalki@darwaemaar.com"]', 'malageel@darwaemaar.com', 'ADMIN,CONVEYANCE', true)
ON CONFLICT (request_type) DO UPDATE SET
  request_type_label = EXCLUDED.request_type_label,
  assigned_to = EXCLUDED.assigned_to,
  cc_list = EXCLUDED.cc_list,
  notify_roles = EXCLUDED.notify_roles,
  is_active = EXCLUDED.is_active;

COMMIT;

-- ✅ تمت إضافة البيانات الافتراضية بنجاح
