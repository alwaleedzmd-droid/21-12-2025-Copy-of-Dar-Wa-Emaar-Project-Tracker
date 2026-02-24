-- ═══════════════════════════════════════════════════════════
-- جدول إدارة سير الموافقات (Workflow Routes Management)
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- 1️⃣ إنشاء جدول workflow_routes
CREATE TABLE IF NOT EXISTS public.workflow_routes (
  id BIGSERIAL PRIMARY KEY,
  request_type TEXT NOT NULL UNIQUE,
  request_type_label TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  cc_list TEXT DEFAULT '',
  notify_roles TEXT DEFAULT 'ADMIN',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ إضافة تعليقات توضيحية
COMMENT ON TABLE public.workflow_routes IS 'جدول توجيه الطلبات - يحدد المسؤول والنسخ لكل نوع طلب';
COMMENT ON COLUMN public.workflow_routes.request_type IS 'نوع الطلب (TECHNICAL_SECTION, DEED_CLEARANCE, إلخ)';
COMMENT ON COLUMN public.workflow_routes.request_type_label IS 'اسم نوع الطلب بالعربية';
COMMENT ON COLUMN public.workflow_routes.assigned_to IS 'المسؤول المباشر الذي يوجه له الطلب';
COMMENT ON COLUMN public.workflow_routes.cc_list IS 'قائمة النسخ (CC) - أسماء مفصولة بفاصلة';
COMMENT ON COLUMN public.workflow_routes.notify_roles IS 'الأدوار التي تستقبل إشعارات - مفصولة بفاصلة';
COMMENT ON COLUMN public.workflow_routes.is_active IS 'هل نوع الطلب نشط ويستخدم في النظام';

-- 3️⃣ إدخال البيانات الافتراضية
INSERT INTO public.workflow_routes (request_type, request_type_label, assigned_to, cc_list, notify_roles, is_active)
VALUES 
  ('TECHNICAL_SECTION', 'طلب تقني', 'صالح اليحيى', 'الوليد الدوسري, مساعد العقيل, قسم PR, القسم الفني', 'ADMIN,PR_MANAGER,TECHNICAL', true),
  ('DEED_CLEARANCE', 'إفراغ/تصفية', 'الوليد الدوسري', 'مساعد العقيل, قسم CX', 'ADMIN,CONVEYANCE', true),
  ('METER_TRANSFER', 'نقل ملكية عداد', 'نورة المالكي', 'مساعد العقيل, قسم CX', 'ADMIN,CONVEYANCE', true)
ON CONFLICT (request_type) DO NOTHING;

-- 4️⃣ إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_workflow_routes_request_type ON public.workflow_routes(request_type);
CREATE INDEX IF NOT EXISTS idx_workflow_routes_is_active ON public.workflow_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_routes_assigned_to ON public.workflow_routes(assigned_to);

-- 5️⃣ تفعيل Row Level Security (RLS)
ALTER TABLE public.workflow_routes ENABLE ROW LEVEL SECURITY;

-- 6️⃣ سياسات الوصول RLS
-- السماح بالقراءة للمستخدمين المصادق عليهم
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_routes;
CREATE POLICY "Enable read for authenticated users"
  ON public.workflow_routes
  FOR SELECT
  TO authenticated
  USING (true);

-- السماح بالتعديل للمشرفين فقط (Admin)
DROP POLICY IF EXISTS "Enable all for admins" ON public.workflow_routes;
CREATE POLICY "Enable all for admins"
  ON public.workflow_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- 7️⃣ دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_workflow_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8️⃣ Trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS trg_update_workflow_routes_updated_at ON public.workflow_routes;
CREATE TRIGGER trg_update_workflow_routes_updated_at
  BEFORE UPDATE ON public.workflow_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_routes_updated_at();

-- 9️⃣ تحديث cache الـ PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ✅ تم إنشاء جدول workflow_routes بنجاح
-- يمكنك الآن البدء بإدارة سير الموافقات من الواجهة
