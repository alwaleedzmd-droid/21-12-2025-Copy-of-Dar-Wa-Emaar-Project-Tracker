ALTER TABLE public.client_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_read_client_archive" ON public.client_archive
  FOR SELECT USING (true);