-- ═══════════════════════════════════════════════════════════
-- نظام مراحل سير العمل (Workflow Stages System)
-- التاريخ: 24 فبراير 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- 1️⃣ جدول مراحل سير العمل (Workflow Stages)
CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id BIGSERIAL PRIMARY KEY,
  workflow_route_id BIGINT REFERENCES public.workflow_routes(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  stage_description TEXT,
  responsible_party TEXT NOT NULL,
  platform_name TEXT,
  expected_output TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ جدول تتبع تقدم المراحل (Stage Progress Tracking)
CREATE TABLE IF NOT EXISTS public.workflow_stage_progress (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL,
  request_type TEXT NOT NULL,
  stage_id BIGINT REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ جدول تعليقات المراحل (Stage Comments)
CREATE TABLE IF NOT EXISTS public.workflow_stage_comments (
  id BIGSERIAL PRIMARY KEY,
  stage_progress_id BIGINT REFERENCES public.workflow_stage_progress(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ التعليقات
COMMENT ON TABLE public.workflow_stages IS 'مراحل سير العمل لكل نوع طلب';
COMMENT ON TABLE public.workflow_stage_progress IS 'تتبع تقدم المراحل للطلبات';
COMMENT ON TABLE public.workflow_stage_comments IS 'تعليقات المستخدمين على المراحل';

-- 5️⃣ الفهارس
CREATE INDEX IF NOT EXISTS idx_workflow_stages_route ON public.workflow_stages(workflow_route_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_order ON public.workflow_stages(stage_order);
CREATE INDEX IF NOT EXISTS idx_stage_progress_request ON public.workflow_stage_progress(request_id, request_type);
CREATE INDEX IF NOT EXISTS idx_stage_progress_stage ON public.workflow_stage_progress(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_comments_progress ON public.workflow_stage_comments(stage_progress_id);

-- 6️⃣ Row Level Security
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_comments ENABLE ROW LEVEL SECURITY;

-- سياسات workflow_stages
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.workflow_stages;
CREATE POLICY "Enable read for authenticated users"
  ON public.workflow_stages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for admins" ON public.workflow_stages;
CREATE POLICY "Enable all for admins"
  ON public.workflow_stages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- سياسات workflow_stage_progress
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_progress;
CREATE POLICY "Enable read for authenticated"
  ON public.workflow_stage_progress FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_progress;
CREATE POLICY "Enable insert for authenticated"
  ON public.workflow_stage_progress FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated" ON public.workflow_stage_progress;
CREATE POLICY "Enable update for authenticated"
  ON public.workflow_stage_progress FOR UPDATE TO authenticated USING (true);

-- سياسات workflow_stage_comments
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.workflow_stage_comments;
CREATE POLICY "Enable read for authenticated"
  ON public.workflow_stage_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.workflow_stage_comments;
CREATE POLICY "Enable insert for authenticated"
  ON public.workflow_stage_comments FOR INSERT TO authenticated WITH CHECK (true);

-- 7️⃣ Triggers للتحديث التلقائي
CREATE OR REPLACE FUNCTION public.update_workflow_stages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_workflow_stages_updated_at ON public.workflow_stages;
CREATE TRIGGER trg_update_workflow_stages_updated_at
  BEFORE UPDATE ON public.workflow_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_stages_updated_at();

DROP TRIGGER IF EXISTS trg_update_stage_progress_updated_at ON public.workflow_stage_progress;
CREATE TRIGGER trg_update_stage_progress_updated_at
  BEFORE UPDATE ON public.workflow_stage_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_workflow_stages_updated_at();

-- 8️⃣ إضافة المراحل الافتراضية للمسار الفني
-- المسار الفني والإنشائي (TECHNICAL_SECTION)
DO $$
DECLARE
  tech_route_id BIGINT;
BEGIN
  -- الحصول على معرف المسار الفني
  SELECT id INTO tech_route_id FROM public.workflow_routes WHERE request_type = 'TECHNICAL_SECTION' LIMIT 1;
  
  IF tech_route_id IS NOT NULL THEN
    -- إضافة المراحل
    INSERT INTO public.workflow_stages (workflow_route_id, stage_order, stage_title, stage_description, responsible_party, platform_name, expected_output) VALUES
    (tech_route_id, 1, 'إعداد المخططات المعدلة', 'تعديل نظام البناء / رخصة البناء', 'المكتب الهندسي', NULL, 'مخططات معدلة'),
    (tech_route_id, 2, 'تقديم طلب تعديل رخصة', 'تقديم الطلب عبر منصة بلدي', 'صالح اليحيى', 'منصة بلدي', 'طلب مقدم'),
    (tech_route_id, 3, 'مراجعة واعتماد الطلب', 'مراجعة الطلب في النظام واعتماده', 'صالح اليحيى', 'منصة بلدي', 'رخصة بناء معدلة إلكترونية'),
    (tech_route_id, 4, 'التصريح البيئي الإنشائي', 'تقديم خطة إدارة النفايات والضوضاء', 'المركز الوطني للالتزام البيئي', 'النظام البيئي', 'تصريح بيئي'),
    (tech_route_id, 5, 'طلب شهادة امتثال المباني', 'إنهاء العزل والكهرباء وطلب شهادة الأشغال', 'صالح اليحيى', 'منصة بلدي / إتمام', 'شهادة إشغال'),
    (tech_route_id, 6, 'الرفع المساحي', 'إصدار قرارات مساحية / فصل رخص البناء', 'مكتب هندسي معتمد', NULL, 'قرار مساحي'),
    (tech_route_id, 7, 'أرشفة القرار', 'أرشفة القرار المساحي في ملف المشروع', 'صالح اليحيى', 'دار وإعمار', 'قرار مؤرشف')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- المسار العقاري (DEED_CLEARANCE)
DO $$
DECLARE
  deed_route_id BIGINT;
BEGIN
  SELECT id INTO deed_route_id FROM public.workflow_routes WHERE request_type = 'DEED_CLEARANCE' LIMIT 1;
  
  IF deed_route_id IS NOT NULL THEN
    INSERT INTO public.workflow_stages (workflow_route_id, stage_order, stage_title, stage_description, responsible_party, platform_name, expected_output) VALUES
    (deed_route_id, 1, 'طلب فرز وحدات', 'تقديم طلب فرز الوحدات العقارية عبر إتمام', 'الوليد الدوسري', 'إتمام', 'محضر فرز'),
    (deed_route_id, 2, 'إصدار صكوك مستقلة', 'تقديم طلب إصدار صكوك مستقلة عبر ناجز', 'الوليد الدوسري', 'ناجز', 'صكوك إلكترونية مستقلة'),
    (deed_route_id, 3, 'رفع الحجز عن الصكوك', 'سداد الرسوم أو إنهاء الموانع القانونية', 'الوليد الدوسري', 'وزارة العدل / ناجز', 'صك متاح للإفراغ'),
    (deed_route_id, 4, 'تحديث بيانات المالك', 'تعديل بيانات المالك برخصة البناء', 'الوليد الدوسري', 'ناجز + بلدي', 'رخصة محدثة')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- مسار نقل ملكية العدادات (METER_TRANSFER)
DO $$
DECLARE
  meter_route_id BIGINT;
BEGIN
  SELECT id INTO meter_route_id FROM public.workflow_routes WHERE request_type = 'METER_TRANSFER' LIMIT 1;
  
  IF meter_route_id IS NOT NULL THEN
    INSERT INTO public.workflow_stages (workflow_route_id, stage_order, stage_title, stage_description, responsible_party, platform_name, expected_output) VALUES
    (meter_route_id, 1, 'تقديم طلب توصيلة دائمة', 'طلب فتح خدمة مياه/كهرباء', 'المسؤول المباشر', 'شركة المياه/الكهرباء', 'طلب مقدم'),
    (meter_route_id, 2, 'سداد المقابل المالي', 'سداد رسوم التوصيل', 'المسؤول المباشر', 'النظام', 'فاتورة مسددة'),
    (meter_route_id, 3, 'متابعة التركيب الميداني', 'متابعة تركيب العداد في الموقع', 'المسؤول المباشر', NULL, 'عداد مركب'),
    (meter_route_id, 4, 'نقل ملكية العداد', 'طلب نقل ملكية للمشترك الجديد', 'المسؤول المباشر', 'تطبيق الشركة', 'ملكية منقولة')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;

-- ✅ تم إنشاء نظام مراحل سير العمل بنجاح
