
-- Invite links for the Share the Love viral referral flow
CREATE TABLE public.invite_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  click_count INTEGER NOT NULL DEFAULT 0,
  signup_count INTEGER NOT NULL DEFAULT 0
);

-- Index for fast code lookups
CREATE INDEX idx_invite_links_code ON public.invite_links (code);
CREATE INDEX idx_invite_links_user ON public.invite_links (user_id);

-- Enable RLS
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own invite links
CREATE POLICY "Users can view own invites"
  ON public.invite_links FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own invite links
CREATE POLICY "Users can create own invites"
  ON public.invite_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own invite links (for incrementing counts)
CREATE POLICY "Users can update own invites"
  ON public.invite_links FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow public read for click tracking (anyone with the code can look it up)
CREATE POLICY "Public can read by code"
  ON public.invite_links FOR SELECT
  USING (true);
