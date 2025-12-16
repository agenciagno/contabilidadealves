-- Tabela de transações
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'despesa')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transactions from their company"
ON public.transactions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create transactions for their company"
ON public.transactions FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update transactions from their company"
ON public.transactions FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete transactions from their company"
ON public.transactions FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;

-- Index for performance
CREATE INDEX idx_transactions_company_date ON public.transactions(company_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_transactions_bank ON public.transactions(bank_id);