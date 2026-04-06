
-- Add responsible_id to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS responsible_id uuid;

-- Create fiscal_tasks table
CREATE TABLE public.fiscal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  responsible_id uuid,
  title varchar NOT NULL,
  description text,
  status varchar NOT NULL DEFAULT 'a_fazer',
  due_date date NOT NULL,
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_tasks_select" ON public.fiscal_tasks
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
CREATE POLICY "fiscal_tasks_insert" ON public.fiscal_tasks
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
CREATE POLICY "fiscal_tasks_update" ON public.fiscal_tasks
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );
CREATE POLICY "fiscal_tasks_delete" ON public.fiscal_tasks
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR is_super_admin(auth.uid())
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_fiscal_tasks_updated_at
  BEFORE UPDATE ON public.fiscal_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
