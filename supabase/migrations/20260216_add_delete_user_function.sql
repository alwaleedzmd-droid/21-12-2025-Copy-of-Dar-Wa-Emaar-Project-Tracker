-- وظيفة حذف المستخدم من auth.users و profiles
-- يجب أن يكون المستخدم الذي يستدعي هذه الوظيفة مدير نظام (ADMIN)

CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- حذف الملف الشخصي أولاً
  DELETE FROM public.profiles WHERE id = user_id;
  
  -- حذف المستخدم من auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- منح صلاحية التنفيذ للمستخدمين المصادقين
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO authenticated;
