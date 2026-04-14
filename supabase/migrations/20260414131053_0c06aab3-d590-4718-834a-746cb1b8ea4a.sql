
-- Atualizar default de profiles.allowed_modules
ALTER TABLE profiles ALTER COLUMN allowed_modules SET DEFAULT ARRAY['home','legalizacao','fiscal','pessoal_rh','financeiro','clientes','configuracoes'];

-- Atualizar default de companies.plan_modules
ALTER TABLE companies ALTER COLUMN plan_modules SET DEFAULT ARRAY['home','legalizacao','fiscal','pessoal_rh','financeiro','clientes','configuracoes'];

-- Migrar dados existentes: 'crm' → 'clientes'
UPDATE profiles SET allowed_modules = array_replace(allowed_modules, 'crm', 'clientes');
UPDATE companies SET plan_modules = array_replace(plan_modules, 'crm', 'clientes');

-- Adicionar novos módulos aos registros existentes que não os têm
UPDATE profiles SET allowed_modules = allowed_modules || ARRAY['home','legalizacao','pessoal_rh','configuracoes']
  WHERE NOT (allowed_modules @> ARRAY['home']);
UPDATE companies SET plan_modules = plan_modules || ARRAY['home','legalizacao','pessoal_rh','configuracoes']
  WHERE NOT (plan_modules @> ARRAY['home']);
