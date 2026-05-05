## Correções no fluxo de criação e autenticação

### 1. Migração de banco de dados
- Adicionar coluna `password_changed_at` (timestamptz, nullable) na tabela `profiles`
- Alterar o default da coluna `status` de `'active'` para `'active'` (já é `'active'`, confirmar)

### 2. Edge Function `create-user-v2`
- No INSERT do profile (CREATE MODE), adicionar `status: 'active'` explicitamente
- Manter `force_password_change: true` como está (compatibilidade)
- Garantir que `password_changed_at` fique `null` para novos usuários (default)

### 3. AuthContext - Remover bloqueio de `pending`
- Remover o bloco que verifica `status === 'pending'` e faz signOut
- Manter apenas o bloqueio para `status === 'blocked'`

### 4. useUserRole - Usar `password_changed_at`
- Adicionar `password_changed_at` ao select do query
- Mudar `forcePasswordChange` para retornar `true` quando `password_changed_at` for `null` (em vez de usar o campo `force_password_change`)

### 5. ForcePasswordChange - Atualizar `password_changed_at`
- Após troca de senha bem-sucedida, fazer update em `password_changed_at: new Date().toISOString()` além de `force_password_change: false`

### 6. Redeploy da Edge Function
- Redeployar `create-user-v2` após as alterações

### Arquivos modificados
- `supabase/functions/create-user-v2/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useUserRole.ts`
- `src/components/auth/ForcePasswordChange.tsx`
- Nova migração SQL para `password_changed_at`
