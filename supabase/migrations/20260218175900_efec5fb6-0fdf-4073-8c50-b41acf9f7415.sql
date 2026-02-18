
-- Migração 2: Criar tabela boleto_controls com RLS e trigger de updated_at
CREATE TABLE public.boleto_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  reference_month DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'PENDING',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.boleto_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view boleto_controls from their company"
  ON public.boleto_controls FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create boleto_controls for their company"
  ON public.boleto_controls FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update boleto_controls from their company"
  ON public.boleto_controls FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete boleto_controls from their company"
  ON public.boleto_controls FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_boleto_controls_updated_at
  BEFORE UPDATE ON public.boleto_controls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
