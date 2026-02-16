-- مقارنة بين حساب شغال وحساب معطل
SELECT 
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at IS NOT NULL as email_confirmed,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change_confirm_status,
  is_sso_user,
  is_anonymous,
  banned_until,
  deleted_at,
  phone,
  phone_confirmed_at
FROM auth.users
WHERE email IN ('adaldawsari@darwaemaar.com', 'malageel@darwaemaar.com')
ORDER BY email;
