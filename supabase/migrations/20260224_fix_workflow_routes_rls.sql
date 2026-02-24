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
DROP POLICY IF EXISTS "workflow_routes_insert_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_update_policy" ON public.workflow_routes;
DROP POLICY IF EXISTS "workflow_routes_delete_policy" ON public.workflow_routes;

-- 2️⃣ إنشاء سياسات جديدة مبسطة
-- السماح بالقراءة لجميع المستخدمين المصادق عليهم
CREATE POLICY "workflow_routes_select_policy"
  ON public.workflow_routes
  FOR SELECT
  TO authenticated
  USING (true);

-- السماح بالإضافة لجميع المستخدمين المصادق عليهم (مؤقتاً)
CREATE POLICY "workflow_routes_insert_policy"
  ON public.workflow_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- السماح بالتعديل للمشرفين فقط
CREATE POLICY "workflow_routes_update_policy"
  ON public.workflow_routes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- السماح بالحذف للمشرفين فقط
CREATE POLICY "workflow_routes_delete_policy"
  ON public.workflow_routes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

COMMIT;

-- ✅ تم إصلاح سياسات RLS
-- 
-- السياسات الحالية:
-- - القراءة: متاحة لجميع المستخدمين المصادق عليهم
-- - الإضافة: متاحة لجميع المستخدمين المصادق عليهم
-- - التعديل: للمشرفين (ADMIN) فقط
-- - الحذف: للمشرفين (ADMIN) فقط
