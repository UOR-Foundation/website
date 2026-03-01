-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public can read by code" ON public.invite_links;

-- Replace with a secure policy: only authenticated users can read their own invite links
CREATE POLICY "Users can read own invite links"
  ON public.invite_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- For public invite code lookups (e.g. landing page referral tracking),
-- use a security-definer function that returns only the minimal needed data
CREATE OR REPLACE FUNCTION public.lookup_invite_code(lookup_code text)
RETURNS TABLE(id uuid, code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code
  FROM public.invite_links
  WHERE code = lookup_code
  LIMIT 1;
$$;

-- Increment click count securely via security-definer function
CREATE OR REPLACE FUNCTION public.record_invite_click(click_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invite_links
  SET click_count = click_count + 1
  WHERE code = click_code;
END;
$$;