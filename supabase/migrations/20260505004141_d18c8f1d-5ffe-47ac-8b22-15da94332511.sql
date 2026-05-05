
-- Create active_sessions table (no FK to auth.users to respect reserved schema rules)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  session_uuid TEXT NOT NULL,
  device_info TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: user manages own sessions
CREATE POLICY "Users manage own sessions"
  ON public.active_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: super admin can read all sessions from their company
CREATE POLICY "Super admin reads all sessions"
  ON public.active_sessions
  FOR SELECT
  USING (
    (company_id = public.get_user_company_id(auth.uid()))
    OR public.is_super_admin(auth.uid())
  );

-- Policy: super admin can delete any session from their company
CREATE POLICY "Super admin deletes sessions"
  ON public.active_sessions
  FOR DELETE
  USING (
    (company_id = public.get_user_company_id(auth.uid()))
    OR public.is_super_admin(auth.uid())
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
