-- Create recurring_transactions table
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  description VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('receita', 'despesa')),
  frequency VARCHAR NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view recurring transactions from their company"
  ON public.recurring_transactions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create recurring transactions for their company"
  ON public.recurring_transactions FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update recurring transactions from their company"
  ON public.recurring_transactions FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete recurring transactions from their company"
  ON public.recurring_transactions FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;

-- Index for performance
CREATE INDEX idx_recurring_transactions_company_active ON public.recurring_transactions(company_id, is_active);