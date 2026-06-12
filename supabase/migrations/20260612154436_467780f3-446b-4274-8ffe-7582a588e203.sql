
CREATE TABLE public.collaborator_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  absent_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  covering_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT 'ferias',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  tasks_transferred integer NOT NULL DEFAULT 0,
  clients_transferred jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_reverted_at timestamptz,
  reverted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revert_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_collaborator_coverage_company ON public.collaborator_coverage(company_id);
CREATE INDEX idx_collaborator_coverage_active ON public.collaborator_coverage(company_id, is_active);
CREATE INDEX idx_collaborator_coverage_absent ON public.collaborator_coverage(absent_profile_id);
CREATE INDEX idx_collaborator_coverage_covering ON public.collaborator_coverage(covering_profile_id);
CREATE INDEX idx_collaborator_coverage_end_date ON public.collaborator_coverage(end_date) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_coverage TO authenticated;
GRANT ALL ON public.collaborator_coverage TO service_role;

ALTER TABLE public.collaborator_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coverage_select_company" ON public.collaborator_coverage
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "coverage_insert_company" ON public.collaborator_coverage
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "coverage_update_company" ON public.collaborator_coverage
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "coverage_delete_company" ON public.collaborator_coverage
  FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_collaborator_coverage_updated_at
  BEFORE UPDATE ON public.collaborator_coverage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
