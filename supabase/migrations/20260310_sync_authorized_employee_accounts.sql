-- مزامنة الحسابات المعتمدة فقط حسب قائمة الإدارة (March 2026)
-- كلمة المرور الافتراضية لجميع الحسابات: 123456

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  has_create_new_user BOOLEAN;
  r RECORD;
  pwd TEXT := '123456';
  pwd_hash TEXT := encode(extensions.digest('123456', 'sha256'), 'hex');
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_new_user'
  ) INTO has_create_new_user;

  IF NOT has_create_new_user THEN
    RAISE EXCEPTION 'Function public.create_new_user(...) is required before running this migration';
  END IF;

  CREATE TEMP TABLE _approved_accounts (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    user_dept TEXT NOT NULL DEFAULT ''
  ) ON COMMIT DROP;

  INSERT INTO _approved_accounts (email, full_name, user_role, user_dept) VALUES
    ('malageel@darwaemaar.com', 'مساعد العقيل', 'ADMIN', ''),
    ('ssalyahya@darwaemaar.com', 'صالح اليحيي', 'PR_MANAGER', ''),
    ('maashammari@darwaemaar.com', 'محمد الشمري', 'PR_MANAGER', ''),
    ('malbahri@darwaemaar.com', 'محمد البحري', 'PR_MANAGER', ''),
    ('easalama@darwaemaar.com', 'سيد سلامة', 'TECHNICAL', ''),
    ('emelshity@darwaemaar.com', 'اسلام', 'TECHNICAL', ''),
    ('mbuhaisi@darwaemaar.com', 'محمود بحيصي', 'TECHNICAL', ''),
    ('hmaqel@darwaemaar.com', 'حمزة عقيل', 'TECHNICAL', ''),
    ('saalabdulsalam@darwaemaar.com', 'سارة عبدالسلام', 'CONVEYANCE', ''),
    ('taalmalki@darwaemaar.com', 'تماني المالكي', 'CONVEYANCE', ''),
    ('smalsanawi@darwaemaar.com', 'شذى الصنعاوي', 'CONVEYANCE', ''),
    ('bsalzamaa@darwaemaar.com', 'بشرى القحطاني', 'CONVEYANCE', ''),
    ('hmalsenbel@darwaemaar.com', 'حسن السنبل', 'CONVEYANCE', ''),
    ('ffalotaibi@darwaemaar.com', 'فهد العتيبي', 'CONVEYANCE', '');

  -- جمع معرفات الحسابات غير المعتمدة لاستخدامها في التنظيف الآمن
  CREATE TEMP TABLE _unauthorized_user_ids (
    id UUID PRIMARY KEY,
    email TEXT
  ) ON COMMIT DROP;

  INSERT INTO _unauthorized_user_ids (id, email)
  SELECT u.id, u.email
  FROM auth.users u
  WHERE lower(u.email) LIKE '%@darwaemaar.com'
    AND lower(u.email) NOT IN (SELECT lower(email) FROM _approved_accounts);

  -- فك ارتباط الإشعارات قبل حذف المستخدمين لتفادي أخطاء FK
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'user_id'
  ) THEN
    UPDATE public.notifications n
    SET user_id = NULL
    WHERE n.user_id IN (SELECT id FROM _unauthorized_user_ids);
  END IF;

  -- حذف كل حسابات الشركة غير المعتمدة من profiles
  DELETE FROM public.profiles p
  WHERE p.id IN (SELECT id FROM _unauthorized_user_ids)
     OR (
       lower(p.email) LIKE '%@darwaemaar.com'
       AND lower(p.email) NOT IN (SELECT lower(email) FROM _approved_accounts)
     );

  -- حذف كل حسابات الشركة غير المعتمدة من auth.users
  DELETE FROM auth.users u
  WHERE u.id IN (SELECT id FROM _unauthorized_user_ids);

  -- إنشاء/تحديث الحسابات المعتمدة بكلمة مرور 123456
  FOR r IN SELECT * FROM _approved_accounts LOOP
    PERFORM public.create_new_user(r.email, pwd, r.full_name, r.user_role, r.user_dept);
  END LOOP;

  -- ضمان توحيد بيانات profiles + كلمة المرور الاحتياطية
  UPDATE public.profiles p
  SET
    name = a.full_name,
    role = a.user_role,
    department = a.user_dept,
    temp_password_hash = pwd_hash,
    temp_password_set_at = NOW(),
    must_change_password = FALSE
  FROM _approved_accounts a
  WHERE lower(p.email) = lower(a.email);
END $$;