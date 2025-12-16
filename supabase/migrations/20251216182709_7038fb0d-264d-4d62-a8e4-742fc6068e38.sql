-- Adicionar colunas de data de emissão e vencimento na tabela transactions
ALTER TABLE transactions
ADD COLUMN issue_date DATE DEFAULT NULL,
ADD COLUMN due_date DATE DEFAULT NULL;

-- Criar tabela de anexos de transações
CREATE TABLE transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  file_name VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view attachments from their company"
  ON transaction_attachments FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create attachments for their company"
  ON transaction_attachments FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete attachments from their company"
  ON transaction_attachments FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Criar bucket de storage para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-attachments', 'transaction-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para storage
CREATE POLICY "Users can upload transaction attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'transaction-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view transaction attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'transaction-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete transaction attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'transaction-attachments' AND auth.role() = 'authenticated');