

## Plano: Reestruturar Sidebar, Módulos e RBAC

### 1. Migration — Atualizar `allowed_modules` e `plan_modules`

Uma migration para atualizar os valores default e existentes:

```sql
-- Atualizar default de profiles.allowed_modules
ALTER TABLE profiles ALTER COLUMN allowed_modules SET DEFAULT ARRAY['home','legalizacao','fiscal','pessoal_rh','financeiro','clientes','configuracoes'];

-- Atualizar default de companies.plan_modules  
ALTER TABLE companies ALTER COLUMN plan_modules SET DEFAULT ARRAY['home','legalizacao','fiscal','pessoal_rh','financeiro','clientes','configuracoes'];

-- Migrar dados existentes: 'crm' → 'clientes'
UPDATE profiles SET allowed_modules = array_replace(allowed_modules, 'crm', 'clientes');
UPDATE companies SET plan_modules = array_replace(plan_modules, 'crm', 'clientes');

-- Adicionar novos módulos aos registros existentes que não os têm
UPDATE profiles SET allowed_modules = allowed_modules || ARRAY['home','legalizacao','pessoal_rh'] 
  WHERE NOT (allowed_modules @> ARRAY['home']);
UPDATE companies SET plan_modules = plan_modules || ARRAY['home','legalizacao','pessoal_rh']
  WHERE NOT (plan_modules @> ARRAY['home']);
```

### 2. Novas Páginas Placeholder

| Arquivo | Conteúdo |
|---------|----------|
| `src/pages/Legalizacao.tsx` | Tela "EM BREVE" centralizada |
| `src/pages/PessoalRH.tsx` | Tela "EM BREVE" centralizada |

### 3. `src/App.tsx` — Novas rotas

Adicionar:
- `/legalizacao` → `Legalizacao`
- `/pessoal-rh` → `PessoalRH`

### 4. `src/components/layout/AppSidebar.tsx` — Reestrutura completa

**Nova estrutura da sidebar (ordem fixa, sem collapsibles):**

```
[Logo Empresa] Nome / CNPJ
─────────────────────────
Home
Legalização          (módulo: legalizacao)
Fiscal ▼             (módulo: fiscal, collapsible)
  └ Tarefas
Pessoal / RH         (módulo: pessoal_rh)
Financeiro ▼         (módulo: financeiro, collapsible)
  └ Dashboard
  └ Lançamentos
  └ Pagar/Receber
  └ Boletos
  └ Conta Corrente
  └ Eventos Contábeis
  └ DRE
Clientes ▼           (módulo: clientes)
  └ Cliente/Fornecedor
  └ Disparos
Configurações        (módulo: configuracoes)
─── (sem divisor) ───
[Avatar] Perfil      (sempre visível)
[Sair]
```

**Mudanças-chave:**
- `moduleKey: 'crm'` → `moduleKey: 'clientes'`, título `'Clientes'`
- Home deixa de ser fixo — agora é filtrado por `allowedModules` (Colaborador pode não vê-lo)
- Legalização e Pessoal/RH como itens simples (sem sub-itens, link direto)
- Remover `<Separator>` abaixo de Home e entre Configurações/Perfil
- Header: usar `company.logo_url` como imagem (fallback para ícone Building2)
- Configurações: visível para Admin e Super Admin (já está), agora também filtrado por `moduleKey: 'configuracoes'`

### 5. `src/pages/SettingsPage.tsx` — Ajustar tabs por role

**Admin** vê: Dados da Empresa, Minha Equipe, Empresas Clientes, Lixeira
**Super Admin** vê: tudo (incluindo Logs e Backup)

Mudança: mover `Empresas Clientes` de `isSuperAdmin` para `!isColaborador` (Admin + Super Admin).

### 6. `src/components/users/UserFormDialog.tsx` — Atualizar `ALL_MODULES`

```typescript
const ALL_MODULES = [
  { key: 'home', label: 'Home', soon: false },
  { key: 'legalizacao', label: 'Legalização', soon: false },
  { key: 'fiscal', label: 'Fiscal', soon: false },
  { key: 'pessoal_rh', label: 'Pessoal / RH', soon: false },
  { key: 'financeiro', label: 'Financeiro', soon: false },
  { key: 'clientes', label: 'Clientes', soon: false },
  { key: 'configuracoes', label: 'Configurações', soon: false },
];
```

### 7. `src/hooks/useUserRole.ts` — Atualizar default

`allowedModules` default de `['financeiro', 'crm']` para `['home', 'financeiro', 'clientes']`.

### Resumo

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | Migration SQL | Schema + dados |
| 2 | `src/pages/Legalizacao.tsx` | Novo |
| 3 | `src/pages/PessoalRH.tsx` | Novo |
| 4 | `src/App.tsx` | Rotas |
| 5 | `src/components/layout/AppSidebar.tsx` | Sidebar |
| 6 | `src/pages/SettingsPage.tsx` | RBAC tabs |
| 7 | `src/components/users/UserFormDialog.tsx` | Módulos |
| 8 | `src/hooks/useUserRole.ts` | Default |

- 1 migration
- 2 páginas novas
- 5 arquivos editados
- 0 lógica de negócio alterada (apenas navegação e RBAC)

