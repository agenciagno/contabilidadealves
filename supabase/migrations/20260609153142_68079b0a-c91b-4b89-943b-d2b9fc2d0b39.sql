ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_cash boolean NOT NULL DEFAULT false;

-- Backfill: mark legacy À Vista transactions (paid + expected_date filled + expected_date = date)
UPDATE public.transactions
SET is_cash = true
WHERE is_paid = true
  AND expected_date IS NOT NULL
  AND date IS NOT NULL
  AND expected_date = date
  AND is_cash = false;

CREATE INDEX IF NOT EXISTS idx_transactions_is_cash ON public.transactions(is_cash) WHERE is_cash = true;