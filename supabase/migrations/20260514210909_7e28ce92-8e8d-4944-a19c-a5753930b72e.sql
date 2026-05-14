ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS canal_entrega text,
  ADD COLUMN IF NOT EXISTS numero_cliente_sicoob integer,
  ADD COLUMN IF NOT EXISTS enviar_cobranca_auto boolean NOT NULL DEFAULT false;