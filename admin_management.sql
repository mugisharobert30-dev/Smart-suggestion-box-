-- ============================================================
-- In-app admin management
-- ============================================================
-- Run this once in Supabase -> SQL Editor.
-- It lets a signed-in SUPERADMIN create admin accounts directly,
-- without relying on Supabase signup/email sending (which rejects
-- some addresses with "email_address_invalid" when using the
-- built-in SMTP service).
-- ============================================================

-- Needed for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- True only for 'superadmin' accounts (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_superadmin()
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
      AND lower(coalesce(role, '')) = 'superadmin'
  );
$$;

ALTER FUNCTION public.is_superadmin() OWNER TO postgres;

-- Promote an existing auth user to admin. Callable only by a superadmin.
CREATE OR REPLACE FUNCTION public.promote_to_admin(
  p_user_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only a superadmin can create admins';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    UPDATE public.profiles
    SET role = 'admin',
        display_name = COALESCE(NULLIF(trim(p_display_name), ''), display_name)
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (p_user_id, NULLIF(trim(p_display_name), ''), 'admin');
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = p_user_id;
END;
$$;

ALTER FUNCTION public.promote_to_admin(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.promote_to_admin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(uuid, text) TO authenticated;

-- Create a ready-to-use admin account (email already confirmed).
-- Callable only by a superadmin. Avoids GoTrue's signup email validation.
CREATE OR REPLACE FUNCTION public.create_admin_account(
  p_email text,
  p_password text,
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_identity jsonb;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only a superadmin can create admins';
  END IF;

  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Email address "%" is invalid', p_email;
  END IF;

  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', coalesce(p_display_name, '')),
    now(),
    now(),
    '', '', '', ''
  );

  v_identity := jsonb_build_object(
    'sub', v_user_id::text,
    'email', v_email,
    'email_verified', true
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
  ) THEN
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id::text, v_user_id, v_identity, 'email',
      now(), now(), now()
    );
  ELSE
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_identity, 'email',
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (v_user_id, NULLIF(trim(p_display_name), ''), 'admin');

  RETURN v_user_id;
END;
$$;

ALTER FUNCTION public.create_admin_account(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_admin_account(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_admin_account(text, text, text) TO authenticated;

-- Update an admin's name, role and/or password. Superadmin only.
CREATE OR REPLACE FUNCTION public.update_admin_account(
  p_user_id uuid,
  p_display_name text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_password text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_current_role text;
  v_new_role text := lower(NULLIF(trim(p_role), ''));
  v_superadmin_count int;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only a superadmin can manage admins';
  END IF;

  SELECT lower(coalesce(role, '')) INTO v_current_role
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_current_role IS NULL OR v_current_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Admin account not found';
  END IF;

  IF v_new_role IS NOT NULL AND v_new_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Role must be "admin" or "superadmin"';
  END IF;

  IF p_user_id = auth.uid() AND v_new_role IS NOT NULL AND v_new_role <> 'superadmin' THEN
    RAISE EXCEPTION 'You cannot remove your own superadmin role';
  END IF;

  IF v_current_role = 'superadmin' AND v_new_role = 'admin' THEN
    SELECT count(*) INTO v_superadmin_count
    FROM public.profiles
    WHERE lower(role) = 'superadmin';

    IF v_superadmin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last superadmin';
    END IF;
  END IF;

  IF p_password IS NOT NULL AND length(p_password) > 0 AND length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  UPDATE public.profiles
  SET display_name = COALESCE(NULLIF(trim(p_display_name), ''), display_name),
      role = COALESCE(v_new_role, role)
  WHERE user_id = p_user_id;

  IF p_password IS NOT NULL AND length(p_password) > 0 THEN
    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

ALTER FUNCTION public.update_admin_account(uuid, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_admin_account(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_admin_account(uuid, text, text, text) TO authenticated;

-- Delete an admin account. Superadmin only; cannot delete self or the last superadmin.
CREATE OR REPLACE FUNCTION public.delete_admin_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_superadmin_count int;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Only a superadmin can manage admins';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  SELECT lower(coalesce(role, '')) INTO v_role
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_role IS NULL OR v_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Admin account not found';
  END IF;

  IF v_role = 'superadmin' THEN
    SELECT count(*) INTO v_superadmin_count
    FROM public.profiles
    WHERE lower(role) = 'superadmin';

    IF v_superadmin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last superadmin';
    END IF;
  END IF;

  -- Reassign/clear references so foreign keys do not block deletion
  UPDATE public.responses SET admin_id = auth.uid() WHERE admin_id = p_user_id;
  UPDATE public.suggestions SET submitter_id = NULL WHERE submitter_id = p_user_id;

  DELETE FROM public.profiles WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

ALTER FUNCTION public.delete_admin_account(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_admin_account(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_admin_account(uuid) TO authenticated;
