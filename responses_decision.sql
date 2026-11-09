-- ============================================================
-- Admin decisions + conversation tracking
-- ============================================================
-- Run this once in Supabase -> SQL Editor.
-- Safe to run more than once.
--
-- * Adds a "decision" column to responses so each reply can record
--   whether the suggestion was accepted or rejected.
-- * Existing suggestions that were never actioned are moved to
--   "under_review" (the new default status).
-- ============================================================

ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS decision text;

ALTER TABLE public.responses
  DROP CONSTRAINT IF EXISTS responses_decision_check;

ALTER TABLE public.responses
  ADD CONSTRAINT responses_decision_check
  CHECK (decision IS NULL OR decision IN ('accepted', 'rejected'));

-- Keep suggestions "under review" until an admin responds.
UPDATE public.suggestions
SET status = 'under_review',
    updated_at = now()
WHERE status = 'submitted'
  AND NOT EXISTS (
    SELECT 1 FROM public.responses r WHERE r.suggestion_id = suggestions.id
  );

-- Allow admins to read the full conversation for a suggestion.
DROP POLICY IF EXISTS "Admins can view responses" ON public.responses;

CREATE POLICY "Admins can view responses" ON public.responses
  FOR SELECT USING (public.is_admin());
