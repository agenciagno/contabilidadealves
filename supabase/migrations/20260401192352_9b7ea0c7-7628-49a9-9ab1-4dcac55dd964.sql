CREATE TABLE public.dre_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  category_id uuid NOT NULL,
  month_year text NOT NULL,
  budget_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, category_id, month_year)
);

ALTER TABLE public.dre_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets" ON public.dre_budgets
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "Users can create budgets" ON public.dre_budgets
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "Users can update budgets" ON public.dre_budgets
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "Users can delete budgets" ON public.dre_budgets
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));