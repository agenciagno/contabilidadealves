
-- Duplicate existing categories: set originals to 'receita', then insert copies as 'despesa'
UPDATE public.categories SET type = 'receita' WHERE type NOT IN ('receita', 'despesa') OR type IS NULL;

INSERT INTO public.categories (company_id, name, type, color, icon)
SELECT company_id, name, 'despesa', color, icon
FROM public.categories
WHERE type = 'receita'
AND NOT EXISTS (
  SELECT 1 FROM public.categories c2 
  WHERE c2.company_id = categories.company_id 
  AND c2.name = categories.name 
  AND c2.type = 'despesa'
);
