

## Plano: Construir Interface e Lógica Completa da Tela DRE

### Mudanças

| # | Recurso | Mudança |
|---|---|---|
| 1 | **Migration SQL** | Criar tabela `dre_budgets` com RLS policies |
| 2 | `src/hooks/useDREData.ts` | Novo hook: busca categories, transações pagas do mês, e budgets; calcula roll-up |
| 3 | `src/pages/DRE.tsx` | Reescrever com seletor de mês/ano, tabela acordeão com 3 colunas, inline editing |

### 1. Migration — Tabela `dre_budgets`

```sql
CREATE TABLE public.dre_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  category_id uuid NOT NULL,
  month_year text NOT NULL,          -- formato 'YYYY-MM'
  budget_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, category_id, month_year)
);

ALTER TABLE public.dre_budgets ENABLE ROW LEVEL SECURITY;

-- RLS (mesma lógica das demais tabelas)
CREATE POLICY "Users can view budgets" ON public.dre_budgets
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "Users can create budgets" ON public.dre_budgets
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "Users can update budgets" ON public.dre_budgets
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "Users can delete budgets" ON public.dre_budgets
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()));
```

### 2. Hook `useDREData.ts`

- **Parâmetro**: `monthYear` (string `'YYYY-MM'`)
- **Queries paralelas**:
  - `categories` (já existe via `useCategories`)
  - `transactions` filtradas: `is_paid = true`, `deleted_at IS NULL`, `date` dentro do mês, excluindo bancos invisíveis
  - `dre_budgets` filtradas pelo `month_year`
- **Cálculo client-side**:
  - Para cada sub evento: `realizado` = soma transações com `category_id` = sub evento id; `previsto` = valor do budget
  - Para cada macro: `realizado` = soma dos sub eventos; `previsto` = soma dos budgets dos sub eventos
  - `RXP` = `realizado - previsto`
- **Mutation**: `upsertBudget` — faz upsert na `dre_budgets` (ON CONFLICT company_id, category_id, month_year)

### 3. Página `DRE.tsx`

**Layout**:
- Header com titulo + seletor de Mês/Ano (popover com mês e ano)
- Tabela com colunas: `Evento Contábil | Previsto (R$) | Realizado (R$) | RXP (R$)`
- Seções separadas: **Receitas** e **Despesas**

**Acordeão (TreeTable)**:
- Linhas macro com `ChevronRight` que rotaciona ao expandir
- Ao expandir, sub eventos aparecem indentados com `pl-8`
- Linha macro exibe totais roll-up (soma dos filhos)
- Macros sem filhos exibem seus próprios valores diretos

**Inline Editing (coluna Previsto)**:
- Clique no valor "Previsto" de um sub evento → transforma em `<Input type="number">`
- onBlur ou Enter → chama `upsertBudget` e salva
- Macros NÃO são editáveis (são roll-up)

**Cores**:
- RXP positivo → verde (`text-emerald-500`)
- RXP negativo → vermelho (`text-red-500`)
- RXP zero → cinza

**Rodapé da tabela**:
- Linha "RESULTADO LÍQUIDO" = Total Receitas Realizado - Total Despesas Realizado

### Detalhes técnicos

**Query de transações para o mês:**
```typescript
const startDate = `${monthYear}-01`;
const endDate = last day of month;
supabase.from('transactions')
  .select('category_id, paid_amount, amount, type')
  .is('deleted_at', null)
  .eq('is_paid', true)
  .gte('date', startDate)
  .lte('date', endDate)
  // + filtro banco invisível
```

**Upsert budget:**
```typescript
supabase.from('dre_budgets')
  .upsert({ company_id, category_id, month_year, budget_value }, 
    { onConflict: 'company_id,category_id,month_year' })
```

### Resumo
- 1 migration (nova tabela + RLS)
- 2 arquivos criados/reescritos
- 0 arquivos existentes impactados

