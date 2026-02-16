-- تحقق من حالة سجلات auth.users
SELECT 
  email,
  email_confirmed_at IS NOT NULL as has_email_confirmed,
  is_sso_user,
  is_anonymous,
  email_change_confirm_status,
  raw_app_meta_data,
  created_at
FROM auth.users
WHERE email LIKE '%@darwaemaar.com'
ORDER BY email
LIMIT 5;
