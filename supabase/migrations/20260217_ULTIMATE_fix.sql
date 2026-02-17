-- ============================================================
-- حل بديل: حذف الحسابات الفاسدة فقط وإعادة إنشاء بسيطة
-- (بدون محاولة تعديل RLS - لا نملك هذه الصلاحيات)
-- ============================================================

-- الخطوة 1: حذف جميع بيانات الإشعارات والـ profiles أولاً
DELETE FROM public.notifications 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@darwaemaar.com'
);

DELETE FROM public.profiles 
WHERE email LIKE '%@darwaemaar.com';

-- الخطوة 2: حذف identities ثم users (ترتيب مهم للـ foreign keys)
DELETE FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@darwaemaar.com'
);

-- الخطوة 3: حذف users - هذا سيحذف جميع المستخدمين الفاسدين
DELETE FROM auth.users 
WHERE email LIKE '%@darwaemaar.com';

-- الخطوة 4: التأكد من وجود pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- الخطوة 7: إعادة تعريف الدالة بشكل بسيط جداً بدون تعقيدات
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT '',
  p_user_role TEXT DEFAULT 'CONVEYANCE',
  p_user_dept TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'auth', 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  -- التحقق من النطاق
  IF p_email NOT LIKE '%@darwaemaar.com' THEN
    RETURN json_build_object('error', 'Invalid domain', 'status', 'error');
  END IF;

  v_user_id := gen_random_uuid();
  v_hashed_password := crypt(p_password, gen_salt('bf'));

  -- إدراج المستخدم مباشرة في auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    v_hashed_password,
    NOW(),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_full_name)
  );

  -- إدراج identity
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    p_email,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    NOW(),
    NOW()
  );

  -- إدراج profile
  INSERT INTO public.profiles (id, email, name, role, department)
  VALUES (v_user_id, p_email, p_full_name, p_user_role, p_user_dept)
  ON CONFLICT (id) DO NOTHING;

  RETURN json_build_object('user_id', v_user_id::text, 'status', 'created');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM, 'status', 'error');
END;
$$;

-- إعطاء الصلاحيات
GRANT EXECUTE ON FUNCTION public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role, anon;

-- الخطوة 8: إنشاء جميع الحسابات
SELECT public.create_new_user('adaldawsari@darwaemaar.com', 'Dar@2026', 'الوليد الدوسري', 'ADMIN', '');
SELECT public.create_new_user('malageel@darwaemaar.com', 'Dar@2026', 'مساعد العقيل', 'PR_MANAGER', '');
SELECT public.create_new_user('ssalyahya@darwaemaar.com', 'Dar@2026', 'صالح اليحيى', 'PR_MANAGER', '');
SELECT public.create_new_user('syahya@darwaemaar.com', 'Dar@2026', 'صالح اليحيى', 'PR_MANAGER', '');
SELECT public.create_new_user('maashammari@darwaemaar.com', 'Dar@2026', 'محمد الشمري', 'PR_MANAGER', '');
SELECT public.create_new_user('mshammari@darwaemaar.com', 'Dar@2026', 'محمد الشمري', 'PR_MANAGER', '');
SELECT public.create_new_user('malbahri@darwaemaar.com', 'Dar@2026', 'محمد البحري', 'PR_MANAGER', '');
SELECT public.create_new_user('ssalama@darwaemaar.com', 'Dar@2026', 'سيد سلامة', 'TECHNICAL', '');
SELECT public.create_new_user('easalama@darwaemaar.com', 'Dar@2026', 'سيد سلامة', 'TECHNICAL', '');
SELECT public.create_new_user('iahmad@darwaemaar.com', 'Dar@2026', 'إسلام أحمد', 'TECHNICAL', '');
SELECT public.create_new_user('emelshity@darwaemaar.com', 'Dar@2026', 'إسلام الملشتي', 'TECHNICAL', '');
SELECT public.create_new_user('mhbaishi@darwaemaar.com', 'Dar@2026', 'محمود بحيصي', 'TECHNICAL', '');
SELECT public.create_new_user('mbuhaisi@darwaemaar.com', 'Dar@2026', 'محمود بحيصي', 'TECHNICAL', '');
SELECT public.create_new_user('mhaqeel@darwaemaar.com', 'Dar@2026', 'حمزة عقيل', 'TECHNICAL', '');
SELECT public.create_new_user('hmaqel@darwaemaar.com', 'Dar@2026', 'حمزة عقيل', 'TECHNICAL', '');
SELECT public.create_new_user('nalmalki@darwaemaar.com', 'Dar@2026', 'نورة المالكي', 'CONVEYANCE', '');
SELECT public.create_new_user('saalfahad@darwaemaar.com', 'Dar@2026', 'سارة الفهد', 'CONVEYANCE', '');
SELECT public.create_new_user('tmashari@darwaemaar.com', 'Dar@2026', 'تماني المشاري', 'CONVEYANCE', '');
SELECT public.create_new_user('shalmalki@darwaemaar.com', 'Dar@2026', 'شذى المالكي', 'CONVEYANCE', '');
SELECT public.create_new_user('balqarni@darwaemaar.com', 'Dar@2026', 'بشرى القرني', 'CONVEYANCE', '');
SELECT public.create_new_user('hmalsalman@darwaemaar.com', 'Dar@2026', 'حسن السلمان', 'CONVEYANCE', '');
SELECT public.create_new_user('falshammari@darwaemaar.com', 'Dar@2026', 'فهد الشمري', 'CONVEYANCE', '');
SELECT public.create_new_user('saalabdulsalam@darwaemaar.com', 'Dar@2026', 'سارة عبدالسلام', 'CONVEYANCE', '');
SELECT public.create_new_user('taalmalki@darwaemaar.com', 'Dar@2026', 'تماني المالكي', 'CONVEYANCE', '');
SELECT public.create_new_user('smalsanawi@darwaemaar.com', 'Dar@2026', 'شذى الصنعاوي', 'CONVEYANCE', '');
SELECT public.create_new_user('bsalzamaa@darwaemaar.com', 'Dar@2026', 'بشرى القحطاني', 'CONVEYANCE', '');
SELECT public.create_new_user('hmalsenbel@darwaemaar.com', 'Dar@2026', 'حسن السنبل', 'CONVEYANCE', '');
SELECT public.create_new_user('ffalotaibi@darwaemaar.com', 'Dar@2026', 'فهد العتيبي', 'CONVEYANCE', '');
