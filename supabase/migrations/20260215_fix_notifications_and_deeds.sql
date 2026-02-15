-- ==================================================
-- إضافة حقل target_role لجدول الإشعارات
-- وحقل updated_at لجدول deeds_requests
-- شغّل هذا في Supabase SQL Editor
-- ==================================================

-- 1. إضافة عمود target_role لتوجيه الإشعارات حسب الدور
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS target_role TEXT;

-- 2. إضافة عمود updated_at لتتبع آخر تحديث على طلب الإفراغ
ALTER TABLE public.deeds_requests 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. تعيين updated_at = created_at للسجلات القديمة
UPDATE public.deeds_requests 
  SET updated_at = created_at 
  WHERE updated_at IS NULL;

-- 4. فهرس على target_role للبحث السريع
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);

-- 5. فهرس على is_read لتسريع جلب غير المقروءة
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
