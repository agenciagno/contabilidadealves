
# Módulos de Acesso na Criação de Usuários da Equipe

## O que será feito

Adicionar os 7 módulos de acesso no formulário "Novo Usuário Interno" (Aba "Minha Equipe"), exibindo checkboxes com seleção visual em tempo real. Além disso, ampliar a lista de módulos no sistema inteiro para incluir os 4 novos módulos solicitados, e garantir que `gwalves13@gmail.com` tenha bypass total (Super Admin) independente de qualquer filtro.

---

## Os 7 Módulos Definidos

| Módulo | Chave | Status da Aba |
|---|---|---|
| Financeiro | `financeiro` | Existe |
| CRM / Clientes | `crm` | Existe |
| Relatórios | `relatorios` | Existe |
| Comercial | `comercial` | Não existe ainda (reservado) |
| Fiscal | `fiscal` | Não existe ainda (reservado) |
| Pessoal / RH | `pessoal_rh` | Não existe ainda (reservado) |
| Configurações | `configuracoes` | Existe |

Os módulos "Comercial", "Fiscal" e "Pessoal / RH" serão incluídos na lista de seleção, mas a sidebar não renderizará entradas para eles por enquanto (pois não há páginas). Quando as abas forem criadas no futuro, basta adicionar o `menuModule` correspondente com o `moduleKey` correto que o controle de acesso funcionará automaticamente.

---

## Mudanças por Arquivo

### 1. `src/components/users/UserFormDialog.tsx`

**Adicionar seleção de módulos ao formulário:**
- O estado `formData` ganha um campo `allowedModules: string[]`, iniciando com todos os 7 módulos marcados como padrão
- Abaixo dos campos de senha, adicionar uma seção "Módulos de Acesso" com checkboxes para cada módulo
- Design: grid 2 colunas com `Checkbox` + label descritivo para cada módulo
- Módulos "reservados" (Comercial, Fiscal, Pessoal/RH) recebem um badge `Em breve` ao lado do nome, mas o checkbox funciona normalmente
- O campo `allowedModules` no body do fetch para `create-user-v2` passa os módulos selecionados (em vez do hardcoded `['financeiro','crm','relatorios']`)
- Validação: pelo menos 1 módulo deve ser selecionado

### 2. `src/components/users/UsersTab.tsx`

**Exibir módulos ativos na tabela de listagem:**
- Adicionar campo `allowed_modules` ao tipo `Profile` e ao SELECT do Supabase
- Coluna "Módulos de Acesso" na tabela com chips/badges coloridos para cada módulo ativo
- Super Admin (usuário atual `gwalves13@gmail.com`) exibe badge especial "Master" ou "Super Admin" em vez de chips de módulos

### 3. `src/components/layout/AppSidebar.tsx`

**Adicionar "Configurações" como módulo controlável + reservar futuros módulos:**
- Adicionar `moduleKey: 'configuracoes'` no item que leva a `/configuracoes` (hoje não tem moduleKey)
- Adicionar no `menuModules` 3 entradas comentadas/placeholder para `comercial`, `fiscal`, `pessoal_rh` — ficam prontas para quando as páginas forem criadas
- O filtro existente (`planModules.includes(key) && allowedModules.includes(key)`) já funcionará automaticamente para todos os novos módulos
- Super Admin (`isSuperAdmin = true`) continua vendo tudo, sem filtro

### 4. `src/components/settings/ClientCompaniesTab.tsx`

**Atualizar lista `MODULE_OPTIONS`:**
- Hoje `MODULE_OPTIONS` tem apenas 3 entradas. Expandir para os 7 módulos completos para que empresas clientes também possam ter os novos módulos no plano delas

---

## Comportamento do Super Admin

O usuário `gwalves13@gmail.com` tem `is_super_admin = true` no banco. No hook `useSuperAdmin`, quando `isSuperAdmin = true`:
- A sidebar renderiza `menuModules` sem filtro (código já existente)
- Na `UsersTab`, o usuário master exibe badge "Super Admin" sem mostrar chips de módulos
- Nenhuma migration é necessária — o banco já suporta qualquer string array em `allowed_modules`

---

## Resumo de Arquivos

| Arquivo | Tipo de Mudança |
|---|---|
| `src/components/users/UserFormDialog.tsx` | Adicionar seleção de 7 módulos com checkboxes + passar ao edge function |
| `src/components/users/UsersTab.tsx` | Exibir módulos na tabela + buscar `allowed_modules` do banco |
| `src/components/layout/AppSidebar.tsx` | Adicionar `moduleKey: 'configuracoes'` + preparar slots para módulos futuros |
| `src/components/settings/ClientCompaniesTab.tsx` | Expandir `MODULE_OPTIONS` para 7 módulos |

Nenhuma migration de banco de dados é necessária.
