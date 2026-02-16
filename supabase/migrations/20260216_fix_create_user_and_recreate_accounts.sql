-- ============================================================
-- إصلاح وظيفة إنشاء المستخدمين وإعادة إنشاء الحسابات
-- الخطأ السابق: "Database error querying schema" عند تسجيل الدخول
-- السبب: سجلات auth.users ناقصة أو تالفة
-- ============================================================

-- تفعيل pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ١. حذف الوظيفة القديمة
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT);

-- ٢. إنشاء الوظيفة المحسّنة مع جميع الأعمدة المطلوبة
CREATE OR REPLACE FUNCTION public.create_new_user(
  email TEXT,
  password TEXT,
  full_name TEXT DEFAULT '',
  user_role TEXT DEFAULT 'CONVEYANCE',
  user_dept TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id UUID;
  existing_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  -- تقييد: فقط إيميلات الشركة مسموحة
  IF create_new_user.email NOT LIKE '%@darwaemaar.com' THEN
    RETURN json_build_object('error', 'Invalid email domain', 'status', 'failed');
  END IF;

  -- تشفير كلمة المرور
  encrypted_pw := crypt(password, gen_salt('bf'));

  -- التحقق من عدم وجود المستخدم مسبقاً
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE auth.users.email = create_new_user.email;
  
  IF existing_user_id IS NOT NULL THEN
    -- المستخدم موجود: تحديث كلمة المرور والملف الشخصي
    UPDATE auth.users SET
      encrypted_password = encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', full_name)
    WHERE id = existing_user_id;

    -- تحديث/إنشاء الملف الشخصي
    INSERT INTO public.profiles (id, email, name, role, department)
    VALUES (existing_user_id, create_new_user.email, full_name, user_role, user_dept)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      department = EXCLUDED.department;
    
    RETURN json_build_object('user_id', existing_user_id, 'status', 'exists_updated');
  END IF;

  -- إنشاء مستخدم جديد
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    email_change_confirm_status,
    is_sso_user,
    is_anonymous
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    create_new_user.email,
    encrypted_pw,
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', full_name),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    0,
    FALSE,
    FALSE
  );

  -- إنشاء هوية المستخدم (مطلوبة لتسجيل الدخول)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    create_new_user.email,
    'email',
    jsonb_build_object('sub', new_user_id::text, 'email', create_new_user.email, 'email_verified', true),
    NOW(),
    NOW(),
    NOW()
  );

  -- إنشاء الملف الشخصي
  INSERT INTO public.profiles (id, email, name, role, department)
  VALUES (new_user_id, create_new_user.email, full_name, user_role, user_dept)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    department = EXCLUDED.department;

  RETURN json_build_object('user_id', new_user_id, 'status', 'created');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM, 'status', 'failed');
END;
$$;

-- منح صلاحية التنفيذ (بما في ذلك anon للإصلاح التلقائي من صفحة تسجيل الدخول)
GRANT EXECUTE ON FUNCTION public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ============================================================
-- ٣. إصلاح حسابات المستخدمين الحالية (تحديث كلمات المرور والأعمدة الناقصة)
--    يمكنك نسخ هذا الجزء فقط وتشغيله في SQL Editor
-- ============================================================

-- المدير العام
SELECT public.create_new_user('adaldawsari@darwaemaar.com', 'Dar@2026', 'الوليد الدوسري', 'ADMIN', '');

-- علاقات عامة (PR_MANAGER)
SELECT public.create_new_user('malageel@darwaemaar.com', 'Dar@2026', 'مساعد العقيل', 'PR_MANAGER', '');
SELECT public.create_new_user('ssalyahya@darwaemaar.com', 'Dar@2026', 'صالح اليحيى', 'PR_MANAGER', '');
SELECT public.create_new_user('syahya@darwaemaar.com', 'Dar@2026', 'صالح اليحيى', 'PR_MANAGER', '');
SELECT public.create_new_user('maashammari@darwaemaar.com', 'Dar@2026', 'محمد الشمري', 'PR_MANAGER', '');
SELECT public.create_new_user('mshammari@darwaemaar.com', 'Dar@2026', 'محمد الشمري', 'PR_MANAGER', '');
SELECT public.create_new_user('malbahri@darwaemaar.com', 'Dar@2026', 'محمد البحري', 'PR_MANAGER', '');

-- القسم الفني (TECHNICAL)
SELECT public.create_new_user('ssalama@darwaemaar.com', 'Dar@2026', 'سيد سلامة', 'TECHNICAL', '');
SELECT public.create_new_user('easalama@darwaemaar.com', 'Dar@2026', 'سيد سلامة', 'TECHNICAL', '');
SELECT public.create_new_user('iahmad@darwaemaar.com', 'Dar@2026', 'إسلام أحمد', 'TECHNICAL', '');
SELECT public.create_new_user('emelshity@darwaemaar.com', 'Dar@2026', 'إسلام الملشتي', 'TECHNICAL', '');
SELECT public.create_new_user('mhbaishi@darwaemaar.com', 'Dar@2026', 'محمود بحيصي', 'TECHNICAL', '');
SELECT public.create_new_user('mbuhaisi@darwaemaar.com', 'Dar@2026', 'محمود بحيصي', 'TECHNICAL', '');
SELECT public.create_new_user('mhaqeel@darwaemaar.com', 'Dar@2026', 'حمزة عقيل', 'TECHNICAL', '');
SELECT public.create_new_user('hmaqel@darwaemaar.com', 'Dar@2026', 'حمزة عقيل', 'TECHNICAL', '');

-- موظفو الإفراغات (CONVEYANCE)
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
