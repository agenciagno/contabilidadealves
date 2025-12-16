-- Função para recalcular o saldo do banco
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.bank_id IS NOT NULL THEN
      UPDATE banks 
      SET current_balance = initial_balance + COALESCE((
        SELECT SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END)
        FROM transactions 
        WHERE bank_id = OLD.bank_id AND is_paid = true
      ), 0)
      WHERE id = OLD.bank_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Para INSERT ou UPDATE
  IF NEW.bank_id IS NOT NULL THEN
    UPDATE banks 
    SET current_balance = initial_balance + COALESCE((
      SELECT SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END)
      FROM transactions 
      WHERE bank_id = NEW.bank_id AND is_paid = true
    ), 0)
    WHERE id = NEW.bank_id;
  END IF;

  -- Se mudou de banco, atualiza o banco antigo também
  IF TG_OP = 'UPDATE' AND OLD.bank_id IS NOT NULL AND OLD.bank_id IS DISTINCT FROM NEW.bank_id THEN
    UPDATE banks 
    SET current_balance = initial_balance + COALESCE((
      SELECT SUM(CASE WHEN type = 'receita' THEN amount ELSE -amount END)
      FROM transactions 
      WHERE bank_id = OLD.bank_id AND is_paid = true
    ), 0)
    WHERE id = OLD.bank_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_update_bank_balance ON transactions;
CREATE TRIGGER trigger_update_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance();

-- Recalcular saldos existentes de todos os bancos
UPDATE banks b
SET current_balance = b.initial_balance + COALESCE((
  SELECT SUM(CASE WHEN t.type = 'receita' THEN t.amount ELSE -t.amount END)
  FROM transactions t 
  WHERE t.bank_id = b.id AND t.is_paid = true
), 0);