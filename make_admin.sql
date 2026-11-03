-- ============================================================
-- Promote an existing user to admin
-- ============================================================
-- 1. Replace 'admin@example.com' with the email you use to log in.
-- 2. Open your Supabase project -> SQL Editor -> paste this file -> Run.
-- 3. Then log in again at /admin/login.
-- ============================================================

-- Create a profile row if the user does not have one yet
INSERT INTO public.profiles (user_id, display_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.email),
  'admin'
FROM auth.users u
WHERE lower(u.email) = lower('admin@example.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
  );

-- Promote the user if a profile already exists
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('admin@example.com');

-- Verify the result (should return role = admin)
SELECT u.email, p.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE lower(u.email) = lower('admin@example.com');
