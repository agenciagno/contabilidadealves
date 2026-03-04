
CREATE OR REPLACE FUNCTION public.update_bank_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.bank_id IS NOT NULL THEN
      UPDATE banks 
      SET current_balance = initial_balance + COALESCE((
        SELECT SUM(CASE WHEN type = 'receita' THEN COALESCE(paid_amount, amount) ELSE -COALESCE(paid_amount, amount) END)
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
      SELECT SUM(CASE WHEN type = 'receita' THEN COALESCE(paid_amount, amount) ELSE -COALESCE(paid_amount, amount) END)
      FROM transactions 
      WHERE bank_id = NEW.bank_id AND is_paid = true
    ), 0)
    WHERE id = NEW.bank_id;
  END IF;

  -- Se mudou de banco, atualiza o banco antigo também
  IF TG_OP = 'UPDATE' AND OLD.bank_id IS NOT NULL AND OLD.bank_id IS DISTINCT FROM NEW.bank_id THEN
    UPDATE banks 
    SET current_balance = initial_balance + COALESCE((
      SELECT SUM(CASE WHEN type = 'receita' THEN COALESCE(paid_amount, amount) ELSE -COALESCE(paid_amount, amount) END)
      FROM transactions 
      WHERE bank_id = OLD.bank_id AND is_paid = true
    ), 0)
    WHERE id = OLD.bank_id;
  END IF;

  RETURN NEW;
END;
$function$;
