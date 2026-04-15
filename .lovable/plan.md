

## Plano: Previsto sempre puxa valor original (independente do status)

### Problema
A query `previstoTxns` em `useDREData.ts` (linha 108) filtra `.eq('is_paid', false)`, excluindo transações já liquidadas. O campo "Previsto" deveria somar o `amount` original de **todas** as transações com `expected_date` no período, independentemente de estarem pagas ou não.

### Mudança (1 arquivo)

**`src/hooks/useDREData.ts`** — Remover o filtro `.eq('is_paid', false)` da query `previstoTxns` (linha 108).

A query passará de:
```
.eq('is_paid', false)
.not('expected_date', 'is', null)
.gte('expected_date', startDate)
.lte('expected_date', endDate)
```
Para:
```
.not('expected_date', 'is', null)
.gte('expected_date', startDate)
.lte('expected_date', endDate)
```

### Impacto
- Previsto passa a refletir o valor original planejado de todas as transações no período
- Realizado permanece inalterado (somente transações liquidadas)
- RxP (Realizado - Previsto) refletirá a variação real entre planejado e executado
- 0 migrations, 1 arquivo editado, 1 linha removida

