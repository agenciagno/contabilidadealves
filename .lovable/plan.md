Plano para resolver o loop da troca obrigatória de senha:

1. Tornar a leitura de `password_changed_at` resiliente
- Ajustar `src/hooks/useUserRole.ts` para não quebrar o fluxo se a query que inclui `password_changed_at` falhar por cache de schema.
- Fazer a leitura principal do perfil com os campos estáveis (`role`, `is_super_admin`, `allowed_modules`, `avatar_url`, `status_active`, `full_name`, `email`).
- Fazer uma leitura separada e protegida de `password_changed_at`.
- Se essa leitura separada falhar ou o campo vier `undefined`, considerar como “senha já trocada” e liberar o acesso.
- Se o campo vier explicitamente `null`, exigir troca de senha.

2. Pular troca obrigatória para Super Admin
- No mesmo hook, se o usuário for `super_admin` por `role` ou `is_super_admin`, retornar `forcePasswordChange: false` independentemente de `password_changed_at`.
- Isso evita que o perfil Super Admin entre no fluxo obrigatório.

3. Corrigir o salvamento da nova senha
- Revisar `src/components/auth/ForcePasswordChange.tsx` mantendo a sequência atual:
  - atualizar a senha no auth com `supabase.auth.updateUser({ password: newPassword })`;
  - atualizar `profiles.password_changed_at` com timestamp atual para o usuário logado;
  - invalidar/refazer a query de perfil usada pelo layout;
  - redirecionar para `/`.
- Ajustar apenas o necessário para evitar loop após salvar, preservando validação de força da senha e UI existente.

4. Garantir criação de usuário novo com troca obrigatória
- Alterar apenas o INSERT de perfil em `supabase/functions/create-user-v2/index.ts` para incluir explicitamente:
  - `password_changed_at: null`
- Não alterar a lógica da função além disso.

5. Aplicar ajuste no banco para usuários existentes / Super Admin
- Como a coluna já foi criada manualmente, não recriar a coluna.
- Criar uma migração segura somente para preencher `password_changed_at = NOW()` em perfis Super Admin que ainda estejam com o campo nulo, garantindo que o perfil existente do Super Admin não seja forçado à troca.

Arquivos previstos:
- `src/hooks/useUserRole.ts`
- `src/components/auth/ForcePasswordChange.tsx` se necessário
- `supabase/functions/create-user-v2/index.ts`
- nova migration SQL apenas para preencher Super Admins existentes com `password_changed_at`, sem alterar schema

Não vou remover, ocultar ou adicionar funcionalidades fora desses pontos.