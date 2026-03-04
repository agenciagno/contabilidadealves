

## Plano: Logica Condicional de Valores (amount vs paid_amount) e Nova Coluna

### Funcao Auxiliar Global

Criar uma funcao helper `getEffectiveAmount(t)` reutilizavel:
```typescript
function getEffectiveAmount(t: { is_paid: boolean; amount: number; paid_amount: number | null }): number {
  return t.is_paid && t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount);
}
```

---

### 1. KPI Cards em Transactions.tsx (linhas 250-308)

**`kpiTotals` (linha 250):** Substituir `Number(t.amount)` por `getEffectiveAmount(t)` no reduce. Transacoes pendentes usam `amount`, pagas usam `paid_amount`.

**`biMetrics` (linha 270):** Mesma logica:
- `contasEmAtraso`, `receitasEmAtraso`: nao pagos, usam `amount` (ja correto pois sao `!is_paid`).
- `receitasPendentesMes/despesasPendentesMes`: nao pagos, usam `amount` (ja correto).
- `receitasMes/despesasMes` e `receitasPagasMes/despesasPagasMes`: aplicar `getEffectiveAmount`.

**Saldo Bancario:** Nao muda — ja vem do `banks.current_balance` calculado pelo trigger SQL que usa `amount`. O trigger SQL (`update_bank_balance`) precisa ser atualizado para usar `COALESCE(paid_amount, amount)` em vez de `amount`.

---

### 2. Trigger SQL `update_bank_balance`

**Migration:** Atualizar o trigger para usar `paid_amount` quando disponivel:
```sql
UPDATE banks 
SET current_balance = initial_balance + COALESCE((
  SELECT SUM(CASE WHEN type = 'receita' 
    THEN COALESCE(paid_amount, amount) 
    ELSE -COALESCE(paid_amount, amount) END)
  FROM transactions 
  WHERE bank_id = $bank_id AND is_paid = true
), 0)
WHERE id = $bank_id;
```

---

### 3. CashFlowTab.tsx (Pagar/Receber)

**KPIs (linha 103):** Nos loops que somam `Number(t.amount)`, usar `getEffectiveAmount(t)`.

**Running balance (linha 151):** No calculo de `saldoAcumulado`, usar `getEffectiveAmount(t)`.

---

### 4. ContactFinancialTab.tsx

**Summary (linha 84):** `totalPago` deve usar `paid_amount ?? amount`. `totalPendente` e `totalVencido` usam `amount` (ja correto, pois sao `!is_paid`).

---

### 5. useTransactions.ts — totals

**Totals reduce (linha 267):** Usar `getEffectiveAmount(t)`.

---

### 6. Nova Coluna "Valor Recebido" na Tabela

**Transactions.tsx:**
- Alterar grid de 9 para 10 colunas: `grid-cols-[40px_100px_1fr_110px_110px_110px_90px_110px_110px_90px]`
- Header: adicionar "Recebido" apos "Valor"
- Rows: adicionar celula exibindo `paid_amount ? formatCurrency(paid_amount) : '—'`

---

### Arquivos Impactados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Transactions.tsx` | KPIs, nova coluna, grid 10 cols |
| `src/components/transactions/CashFlowTab.tsx` | KPIs e running balance |
| `src/components/contacts/ContactFinancialTab.tsx` | Summary totalPago |
| `src/hooks/useTransactions.ts` | Totals reduce |
| Migration SQL | Trigger update_bank_balance com paid_amount |

