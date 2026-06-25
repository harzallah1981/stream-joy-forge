
CREATE TABLE public.acknowledgements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  doc_title TEXT NOT NULL,
  doc_reference TEXT,
  category TEXT,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_email, doc_id)
);
GRANT SELECT, INSERT ON public.acknowledgements TO anon, authenticated;
GRANT ALL ON public.acknowledgements TO service_role;
ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert acks" ON public.acknowledgements FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read acks" ON public.acknowledgements FOR SELECT TO anon, authenticated USING (true);
