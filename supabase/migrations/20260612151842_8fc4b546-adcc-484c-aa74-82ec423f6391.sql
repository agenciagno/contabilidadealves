
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  task_id uuid,
  reference_type text,
  reference_id uuid,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company_created ON public.notifications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User can read own notifications
CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    company_id IS NOT NULL
    AND company_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

-- User can update own notifications (mark as read)
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Authenticated insert (system + edge functions); restrict to own company
CREATE POLICY "Insert notifications in own company"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  company_id IS NULL
  OR company_id = public.get_user_company_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- Admin/super admin delete in own company
CREATE POLICY "Admins delete notifications in company"
ON public.notifications FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
