-- ============================================================
-- Fix: "infinite recursion detected in policy for relation profiles"
-- ============================================================
-- Cause: the profiles RLS policy queried the profiles table itself.
-- Fix: use a SECURITY DEFINER helper that checks the role without
-- going through RLS, then reference that helper from every policy.
--
-- Run this in Supabase -> SQL Editor. Safe to run more than once.
-- ============================================================

-- Helper returns true for admins/superadmins. SECURITY DEFINER means the
-- inner SELECT bypasses RLS, so it cannot recurse.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND lower(role) IN ('admin', 'superadmin')
  );
$$;

-- ---------- profiles ----------
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

-- ---------- suggestions ----------
DROP POLICY IF EXISTS "Admins can update suggestions" ON suggestions;
DROP POLICY IF EXISTS "Admins can update all suggestions" ON suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON suggestions;

CREATE POLICY "Admins can view all suggestions" ON suggestions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update suggestions" ON suggestions
  FOR UPDATE USING (public.is_admin());

-- ---------- responses ----------
DROP POLICY IF EXISTS "Admins can insert responses" ON responses;

CREATE POLICY "Admins can insert responses" ON responses
  FOR INSERT WITH CHECK (public.is_admin());
