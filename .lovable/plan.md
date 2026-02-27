

## Plano de Correções Críticas — Movimentações

### BLOCO 1: Importação — Datas vazias

**Arquivo:** `src/components/transactions/ImportSpreadsheetDialog.tsx`

O código atual na linha 306 já usa `date: paymentDateStr || null`. A função `excelDateToString` (linha 47) já retorna `null` para valores vazios. **A lógica de importação no frontend está correta.**

O problema restante é o banco de dados. A migration anterior removeu o `DEFAULT CURRENT_DATE`, mas preciso confirmar que foi aplicada. Se não, criarei nova migration.

**Ação:** Verificar e garantir que a coluna `date` não tem DEFAULT. Caso ainda tenha, aplicar migration.

---

### BLOCO 2: Aba "Pagar/Receber" — Filtrar apenas pendentes/vencidos

**Arquivo:** `src/components/transactions/CashFlowTab.tsx` (linhas 78-100)

**Problema:** O `filtered` useMemo não exclui transações pagas. Todas passam pela query.

**Solução:** Adicionar filtro inicial na linha 80:
```typescript
let result = transactions.filter(t => !t.is_paid); // Apenas pendentes/vencidos
```

Isso garante que a tabela e os KPIs de Entradas/Saídas só considerem transações pendentes ou vencidas. O Capital de Giro já filtra `!t.is_paid` corretamente (linha 113).

---

### BLOCO 3: Reatividade de Filtros e Ordenação

**Arquivo:** `src/pages/Transactions.tsx`

**3a. Filtros:** Os filtros já estão no `useMemo` (linha 149) com as dependências corretas (linha 189). A busca por `searchTerm` (linha 171) já inclui `contact.name`. Os filtros de `contactFilter`, `categoryFilter`, `bankFilter` comparam por ID corretamente. **Os filtros já devem funcionar.** Vou verificar se a `UnifiedFilterBox` está passando os valores corretos.

**3b. Ordenação (linhas 178-186):** A comparação `localeCompare` funciona para strings ISO `yyyy-MM-dd`, mas vou reforçar com comparação temporal real:

```typescript
result.sort((a, b) => {
  const dateA = a[sortField];
  const dateB = b[sortField];
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  const timeA = new Date(dateA).getTime();
  const timeB = new Date(dateB).getTime();
  return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
});
```

---

### BLOCO 4: Sticky Header

**Arquivo:** `src/pages/Transactions.tsx` (linha 699)

O cabeçalho já tem `sticky top-0 z-10`. Porém, precisa de `bg-card` (não `bg-muted/40` sozinho que é translúcido) para não ter sobreposição visual durante scroll. O container pai (Card, linha 696) precisa de uma altura máxima com overflow para o sticky funcionar dentro dele.

**Solução:** 
- Adicionar `max-h-[70vh] overflow-auto` ao container da tabela (wrapping div)
- Garantir que o header tenha `bg-card` sólido

**Arquivo:** `src/components/transactions/CashFlowTab.tsx` (linha 322)

- Adicionar `className="sticky top-0 z-10 bg-card"` ao `<TableHeader>`

---

### Resumo de Alterações

| Arquivo | Mudança |
|---|---|
| `CashFlowTab.tsx` | Filtrar `!t.is_paid` no início; sticky header na TableHeader |
| `Transactions.tsx` | Ordenação com `getTime()`; container com `max-h` + `overflow-auto`; bg-card sólido no header |
| Migration (se necessário) | Confirmar DROP DEFAULT na coluna `date` |

