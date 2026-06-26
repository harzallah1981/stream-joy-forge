DROP POLICY IF EXISTS "Anyone can insert acks" ON public.acknowledgements;
CREATE POLICY "Validated acknowledgement inserts" ON public.acknowledgements
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(user_email)) BETWEEN 5 AND 254
  AND position('@' in user_email) > 1
  AND length(trim(user_name)) > 0
  AND length(trim(doc_id)) > 0
  AND length(trim(doc_title)) > 0
  AND action IN ('view', 'download', 'sign')
);

DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.form_submissions;
CREATE POLICY "Validated form submission inserts" ON public.form_submissions
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(form_type)) > 0
  AND length(trim(destination_email)) BETWEEN 5 AND 254
  AND position('@' in destination_email) > 1
  AND jsonb_typeof(payload) = 'object'
);