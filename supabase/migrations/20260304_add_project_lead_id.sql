-- ============================================================================
-- Migration: إضافة حقل "المسؤول المرمّز" على كل مشروع
-- Date: 2026-03-04
-- Purpose: نظام التوجيه الديناميكي - ترميز المسؤول
-- ============================================================================

-- 1. إضافة عمود project_lead_id إلى جدول المشاريع
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_lead_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. إضافة عمود project_lead_name (اسم المسؤول - للعرض السريع بدون JOIN)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_lead_name text;

-- 3. إضافة عمود project_lead_email (إيميل المسؤول - للتوجيه)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_lead_email text;

-- 4. إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_projects_project_lead_id ON public.projects(project_lead_id);

-- 5. تعليق توضيحي
COMMENT ON COLUMN public.projects.project_lead_id IS 'UUID المسؤول المرمّز - عند وجوده يتم توجيه جميع الطلبات إليه';
COMMENT ON COLUMN public.projects.project_lead_name IS 'اسم المسؤول المرمّز (cache) - للعرض بدون استعلام إضافي';
COMMENT ON COLUMN public.projects.project_lead_email IS 'إيميل المسؤول المرمّز - يُستخدم في التوجيه';
