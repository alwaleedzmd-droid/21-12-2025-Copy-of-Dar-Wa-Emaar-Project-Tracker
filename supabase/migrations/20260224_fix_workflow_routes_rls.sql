-- ═══════════════════════════════════════════════════════════
-- إصلاح سياسات RLS لجدول workflow_routes
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- 1️⃣ حذف السياسات القديمة والجديدة (للتأكد من التشغيل المتكرر)
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_routes;
DROP POLICY IF EXISTS "Enable all for admins" ON public.workflow_routes;
DROP POLICY IF EXISTS "Enable insert for system" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_select_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_all_for_admins" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_temp_insert" ON public.workflow_routes;

-- 2️⃣ إنشاء سياسات جديدة محسّنة
-- السماح بالقراءة لجميع المستخدمين المصادق عليهم
CREATE POLICY "workflow_routes_select_policy"
  ON public.workflow_routes
  FOR SELECT
  TO authenticated
  USING (true);

-- السماح بالإضافة والتعديل والحذف للمشرفين فقط
CREATE POLICY "workflow_routes_all_for_admins"
  ON public.workflow_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- 3️⃣ إذا كانت المشكلة مستمرة، يمكن إضافة سياسة مؤقتة للإضافة
-- (احذف هذه السياسة بعد إضافة البيانات الأولية)
CREATE POLICY "workflow_routes_temp_insert"
  ON public.workflow_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;

-- ✅ تم إصلاح سياسات RLS
-- 
-- ملاحظة: بعد إضافة البيانات الافتراضية بنجاح، يمكنك حذف السياسة المؤقتة:
-- DROP POLICY IF EXISTS "workflow_routes_temp_insert" ON public.workflow_routes;
