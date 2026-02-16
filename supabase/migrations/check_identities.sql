-- تحقق من جدول identities
SELECT 
  u.email,
  i.provider,
  i.provider_id,
  i.identity_data
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email LIKE '%@darwaemaar.com'
ORDER BY u.email
LIMIT 10;
