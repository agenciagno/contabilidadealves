
-- Migração 1: Adicionar campos de boleto na tabela contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS boleto_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boleto_value NUMERIC,
  ADD COLUMN IF NOT EXISTS boleto_due_day INTEGER,
  ADD COLUMN IF NOT EXISTS boleto_start_date DATE;
