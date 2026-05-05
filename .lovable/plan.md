
## Análise do Estado Atual

O projeto **já possui** uma infraestrutura completa de autenticação e controle de acesso:

| O que voce pediu | O que ja existe |
|---|---|
| `profiles.role` com CHECK | `profiles.role` TEXT DEFAULT 'colaborador' (ja existe) |
| `profiles.status` | `profiles.status_active` BOOLEAN (ja existe, abordagem diferente) |
| `profiles.modules` | `profiles.allowed_modules` TEXT[] (ja existe) |
| `profiles.name` | `profiles.full_name` (ja existe) |
| `profiles.email` | `profiles.email` (ja existe) |
| Edge Function `create-user` | Edge Function `create-user-v2` (ja existe e funciona) |
| RLS em profiles | RLS ja configurada com `get_user_company_id` e `is_super_admin` |

### Problemas com a migration proposta

1. **Colunas duplicadas**: `role`, `email` ja existem. `name` e `modules` seriam redundantes com `full_name` e `allowed_modules`.
2. **FK para auth.users**: A tabela `active_sessions` referencia `auth.users(id)` diretamente, o que viola as boas praticas do projeto (nunca referenciar schemas reservados como `auth`).
3. **profiles.id vs profiles.user_id**: O schema atual usa `user_id UUID` para referenciar o usuario, nao `id`. As policies propostas usam `id = auth.uid()` que nao funcionaria.
4. **RLS conflitante**: As novas policies de profiles conflitariam com as 4 policies existentes que ja cobrem SELECT, INSERT, UPDATE e DELETE com isolamento por `company_id`.
5. **Edge Function duplicada**: `create-user` faria o mesmo que `create-user-v2` que ja esta em uso no `UserFormDialog.tsx`.

## Plano Proposto

Dado que a infraestrutura ja existe, proponho **apenas as adicoes que fazem sentido** sem quebrar o que funciona:

### 1. Tabela `active_sessions` (adaptada)
- Criar a tabela **sem FK direta para `auth.users`** (usar `user_id UUID NOT NULL` sem constraint)
- RLS usando `get_user_company_id` e `is_super_admin` no padrao do projeto
- Habilitar Realtime

### 2. Adicionar coluna `status` em profiles (se desejado)
- O campo `status_active` (boolean) ja existe. Se voce quer um status com 3 estados (`pending`, `active`, `blocked`), posso adicionar uma coluna `status TEXT DEFAULT 'active'` mantendo `status_active` para compatibilidade.

### 3. Nenhuma nova Edge Function
- `create-user-v2` ja faz tudo que `create-user` faria (cria usuario, insere profile, define role, verifica permissao admin). Nao ha necessidade de duplicar.

### 4. Nenhuma alteracao em telas
- Conforme solicitado, nenhuma tela sera alterada.

---

**Quer que eu prossiga com esse plano adaptado, ou prefere que eu execute exatamente o SQL que voce enviou (ajustando apenas os nomes de coluna para `user_id` em vez de `id`)?**
