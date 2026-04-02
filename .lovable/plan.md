

## Plano: Refatorar DRE com Date Range Picker e lógica baseada em transações reais

### Resumo

Substituir o seletor de mês/ano por um filtro de período (Data Inicial / Data Final) idêntico ao da aba Pagar/Receber. Mudar completamente a lógica das colunas: **Previsto** passa a somar transações pendentes filtradas por `expected_date`, e **Realizado** soma transações pagas filtradas por `date` (data pagamento). Remover a dependência da tabela `dre_budgets` e o inline editing.

### Mudanças

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/hooks/useDREData.ts` | Refatorar para receber `startDate`/`endDate` em vez de `monthYear`; criar 2 queries separadas (previsto + realizado); remover budgets |
| 2 | `src/pages/DRE.tsx` | Substituir MonthYearPicker por date range inputs; remover InlineEdit; ajustar props |
| 3 | `src/hooks/useTransactions.ts` | Adicionar invalidação de `dre-previsto` e `dre-realizado` nos onSuccess de create/update/delete |
| 4 | `src/components/transactions/BulkEditDialog.tsx` | Adicionar invalidação das queries DRE |

### Detalhes técnicos

**1. useDREData.ts — Nova lógica de queries**

Parâmetros: `startDate: string, endDate: string` (formato `yyyy-MM-dd`)

**Query "Previsto"** (`dre-previsto`):
```typescript
supabase.from('transactions')
  .select('category_id, amount, type')
  .is('deleted_at', null)
  .eq('is_paid', false)              // status pendente/vencido = não pago
  .not('expected_date', 'is', null)  // expected_date obrigatório
  .gte('expected_date', startDate)
  .lte('expected_date', endDate)
  // + filtro banco invisível
```

**Query "Realizado"** (`dre-realizado`):
```typescript
supabase.from('transactions')
  .select('category_id, paid_amount, amount, type')
  .is('deleted_at', null)
  .eq('is_paid', true)               // status pago/recebido
  .not('date', 'is', null)           // data pagamento obrigatória
  .gte('date', startDate)
  .lte('date', endDate)
  // + filtro banco invisível
```

**Cálculo client-side (sem mudança na estrutura DRERow):**
- Sub evento: `previsto` = soma `amount` das transações pendentes com `category_id` matching; `realizado` = soma `paid_amount ?? amount` das pagas
- Macro: roll-up (soma dos filhos)
- RXP = `realizado - previsto`
- Remover toda lógica de `dre_budgets`, `upsertBudget`

**2. DRE.tsx — Novo filtro de período**

Substituir `MonthYearPicker` por dois `<Input type="date">` com o mesmo design do CashFlowTab:
```
[CalendarDays icon] [Data Inicial] até [Data Final] [X limpar]
```
Default: primeiro dia do mês atual → último dia do mês atual.

Remover componente `InlineEdit` e `MonthYearPicker`.
Coluna "Previsto" agora exibe apenas `formatCurrency(row.previsto)` (não editável).

**3. Invalidação de cache (reatividade)**

Nos `onSuccess` de `useTransactions.ts` (create, update, delete, togglePaid) e `BulkEditDialog.tsx`, adicionar:
```typescript
queryClient.invalidateQueries({ queryKey: ['dre-previsto'] });
queryClient.invalidateQueries({ queryKey: ['dre-realizado'] });
```

Isso garante que qualquer alteração em transações (incluindo mudança de `expected_date`, `date`, ou `is_paid`) reflita automaticamente na DRE.

### Resumo
- 4 arquivos editados
- 0 migrations
- Tabela `dre_budgets` permanece no banco (sem migration de remoção) mas deixa de ser consultada

