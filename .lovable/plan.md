
# Filtrar Extrato Bancario para Mostrar Apenas Transacoes Realizadas

## Resumo

Adicionar `.eq('is_paid', true)` na Query 2 (transacoes do periodo) no hook `useBankTransactions.ts`. A Query 1 (saldo anterior) ja filtra apenas realizadas. Com isso, tanto o extrato quanto os saldos refletirao exclusivamente movimentacoes confirmadas, permitindo conciliacao direta com o banco.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useBankTransactions.ts` | Adicionar filtro `is_paid = true` na query do periodo |

---

## Mudanca

### Query 2 - Transacoes do Periodo (linha ~75-97)

Adicionar `.eq('is_paid', true)` na query, logo apos o `.order('created_at', { ascending: true })`:

```typescript
let query = supabase
  .from('transactions')
  .select(`...`)
  .eq('is_paid', true)       // <-- ADICIONAR ESTA LINHA
  .order('date', { ascending: true })
  .order('created_at', { ascending: true });
```

Isso garante que:
- O extrato mostra apenas transacoes ja realizadas
- O saldo acumulado (running balance) reflete apenas o realizado
- Os totais de Entradas/Saidas e Saldo Final consideram apenas o realizado
- Fica compativel com a Query 1 que ja filtra `is_paid = true`
