-- Lead capture submissions (Typeform-style waitlist)
CREATE TABLE public.lead_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  use_case TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (public form), but only service role can read
CREATE POLICY "Anyone can submit a lead"
  ON public.lead_submissions
  FOR INSERT
  WITH CHECK (true);

-- Create index on email for dedup checks
CREATE INDEX idx_lead_submissions_email ON public.lead_submissions (email);
