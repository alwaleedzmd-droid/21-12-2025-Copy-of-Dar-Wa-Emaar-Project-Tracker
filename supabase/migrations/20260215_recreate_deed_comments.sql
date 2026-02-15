-- ==================================================
-- إعادة إنشاء جدول deed_comments لتعليقات الإفراغات
-- الجدول تم حذفه بالخطأ في 20260210_drop_unused_tables.sql
-- شغّل هذا في Supabase SQL Editor
-- ==================================================

CREATE TABLE IF NOT EXISTS public.deed_comments (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES public.deeds_requests(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'مستخدم',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهرس للبحث السريع بالطلب
CREATE INDEX IF NOT EXISTS idx_deed_comments_request_id ON public.deed_comments(request_id);

-- تفعيل RLS
ALTER TABLE public.deed_comments ENABLE ROW LEVEL SECURITY;

-- صلاحيات
GRANT ALL ON public.deed_comments TO anon;
GRANT ALL ON public.deed_comments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.deed_comments_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.deed_comments_id_seq TO authenticated;

-- سياسات RLS مفتوحة
CREATE POLICY "allow_select_deed_comments" ON public.deed_comments FOR SELECT USING (true);
CREATE POLICY "allow_insert_deed_comments" ON public.deed_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_deed_comments" ON public.deed_comments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete_deed_comments" ON public.deed_comments FOR DELETE USING (true);
