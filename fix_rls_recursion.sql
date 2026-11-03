-- ============================================================
-- Definitive fix for:
--   "infinite recursion detected in policy for relation profiles"
-- ============================================================
-- Run the ENTIRE file in Supabase -> SQL Editor (don't run only part).
-- Safe to run multiple times.
--
-- Why the recursion happens: a policy on "profiles" looks up "profiles"
-- again, so Postgres evaluates the policy inside its own evaluation.
-- We solve it by checking the role through a SECURITY DEFINER function
-- owned by the table owner, which bypasses RLS.
-- ============================================================

-- 1. Remove EVERY policy on profiles (including ones with unexpected names)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- 2. Make sure the owner of profiles bypasses RLS
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

-- 3. Role-check helper (bypasses RLS because it is SECURITY DEFINER)
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
      AND lower(coalesce(role, '')) IN ('admin', 'superadmin')
  );
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- 4. Recreate the ONLY policies profiles needs
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 5. Recreate admin policies on other tables using the helper
DROP POLICY IF EXISTS "Admins can update suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Admins can update all suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON public.suggestions;

CREATE POLICY "Admins can view all suggestions" ON public.suggestions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update suggestions" ON public.suggestions
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert responses" ON public.responses;

CREATE POLICY "Admins can insert responses" ON public.responses
  FOR INSERT WITH CHECK (public.is_admin());

-- 6. Verification: should list the policies above, with no self-reference
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'suggestions', 'responses')
ORDER BY tablename, policyname;
