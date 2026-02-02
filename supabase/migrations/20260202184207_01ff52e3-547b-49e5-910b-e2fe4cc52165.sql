-- Adicionar coluna is_caixa_geral na tabela banks
ALTER TABLE banks ADD COLUMN is_caixa_geral BOOLEAN DEFAULT FALSE;