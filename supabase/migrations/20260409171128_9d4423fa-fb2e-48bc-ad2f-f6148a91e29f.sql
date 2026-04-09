ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dre_section text NOT NULL DEFAULT 'despesas_operacionais';