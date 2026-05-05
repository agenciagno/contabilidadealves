
## Problema

O `UserFormDialog.tsx` envia chaves em camelCase (`fullName`, `statusActive`, `allowedModules`), mas a Edge Function deployada manualmente espera snake_case (`full_name`, `status_active`, `allowed_modules`). Isso causa erro na edição e `full_name` null na criação.

## Correção

**Arquivo:** `src/components/users/UserFormDialog.tsx`

Enviar ambas as variantes (camelCase e snake_case) no payload para compatibilidade com qualquer versão da Edge Function:

1. **Modo edição (linha ~121-127):** Adicionar `full_name`, `status_active`, `allowed_modules` ao payload, mantendo as chaves camelCase existentes.

2. **Modo criação (linha ~138-148):** Adicionar `full_name`, `status_active`, `allowed_modules`, `company_id`, `force_password_change` ao body, mantendo as chaves camelCase existentes.

Nenhuma outra alteração. Nenhum arquivo da Edge Function será tocado.
