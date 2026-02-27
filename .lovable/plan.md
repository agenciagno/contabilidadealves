

# Plano de Correção: Importação, Filtros e KPIs

## Problemas Identificados

### 1. Limite de 1000 registros na query do Supabase
A query em `useTransactions.ts` (linha 52-60) usa `supabase.from('transactions').select(...)` sem paginação. O Supabase retorna no máximo **1000 linhas por padrão**. Com 2608 lançamentos, apenas ~999 são carregados. Este é o problema raiz que afeta todas as abas.

### 2. Filtro padrão "Este Mês" em Lançamentos e Pagar/Receber
Ambas as páginas inicializam `period` como `'thisMonth'`, mas o pedido é que o padrão seja o **ano vigente**.

### 3. Campo `date` preenchido mesmo quando Data Pagamento está vazia
Na importação, `date: paymentDateStr || dueDateStr || issueDateStr || today` — isso preenche `date` com fallback, mas o campo `date` representa "Data Pagamento". Se está vazio na planilha, deveria ficar como a data atual do banco (DEFAULT CURRENT_DATE) apenas se necessário, mas não deveria usar `dueDateStr` como fallback para `date`.

### 4. Cards "Entradas" e "Saídas" no Pagar/Receber mostram "Recebido"/"Pago"
Pedido: mostrar somatório total (pendentes + pagas) e remover rodapé "Recebido"/"Pago".

## Correções

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/hooks/useTransactions.ts` | Paginar query para buscar TODOS os registros (loop com `.range()` em lotes de 1000) |
| 2 | `src/pages/Transactions.tsx` | Mudar `period` padrão de `'thisMonth'` para `'thisYear'` |
| 3 | `src/components/transactions/CashFlowTab.tsx` | Mudar `period` padrão para `'thisYear'`; Cards Entradas/Saídas: exibir total (pendentes+pagas), remover rodapé |
| 4 | `src/components/transactions/ImportSpreadsheetDialog.tsx` | Corrigir `date`: não usar fallback de due_date/issue_date; manter `issue_date` como `null` se vazio na planilha (não forçar data atual); preservar campos vazios |

## Detalhes Técnicos

### 1. Paginação completa (useTransactions.ts)

```typescript
queryFn: async () => {
  let allData: Transaction[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, category:categories(id, name, color), bank:banks(id, name, color), contact:contacts(id, name, type)`)
      .order('date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    allData = allData.concat(data as Transaction[]);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allData;
}
```

### 2. Filtro padrão "thisYear"

Em `Transactions.tsx` linha 81:
```typescript
const [period, setPeriod] = useState<PeriodFilter>('thisYear');
```

Em `CashFlowTab.tsx` linha 58:
```typescript
const [period, setPeriod] = useState<PeriodFilter>('thisYear');
```

Atualizar `handleClearFilters` e `onClearFilters` para resetar para `'thisYear'` em vez de `'thisMonth'`.

### 3. ImportSpreadsheetDialog — campos vazios preservados

```typescript
// date (Data Pagamento): só preencher se existir na planilha
date: paymentDateStr || new Date().toISOString().split('T')[0],
// issue_date: manter null se vazio
issue_date: issueDateStr || null,
// expected_date: manter null se vazio
expected_date: expectedDateStr || null,
```

O campo `date` no banco tem `DEFAULT CURRENT_DATE` e é NOT NULL, então precisa de um valor. Usar apenas `paymentDateStr` ou fallback para hoje.

### 4. Cards Entradas/Saídas no CashFlowTab

Card Entradas: exibir `kpis.receitasPendentes + kpis.receitasPagas` como valor principal (total de entradas). Remover linha "Recebido".

Card Saídas: exibir `kpis.despesasPendentes + kpis.despesasPagas` como valor principal (total de saídas). Remover linha "Pago".

