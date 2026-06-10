## Alteração: regra do PREVISTO na DRE

### Regra atual
Na coluna **Previsto**, são somadas todas as transações cuja `expected_date` (data prevista) cai no período — independentemente de estarem pagas ou em aberto, e sem olhar a data de pagamento.

### Nova regra
Na coluna **Previsto** entra a transação quando:

- `expected_date` está dentro do período selecionado **E**
- Uma das condições abaixo é verdadeira:
  - A transação está **em aberto** (`is_paid = false`), **ou**
  - A transação está **liquidada** (`is_paid = true`) **e** a data de pagamento (`date`) também está dentro do mesmo período.

Ou seja: se foi paga em mês diferente do previsto, sai do Previsto. Se ainda não foi paga, continua no Previsto.

Exemplos (período = junho/2026):
- Prevista 20/06, paga 10/06 → entra no Previsto. ✅
- Prevista 20/06, paga 20/05 → sai do Previsto. ❌
- Prevista 20/06, em aberto → entra no Previsto. ✅
- Prevista 20/05, paga 10/06 → não entra no Previsto de junho (já era assim). ✅

### O que NÃO muda
- Coluna **Realizado**: continua somando `is_paid = true` com `date` no período.
- **Fluxo de Caixa**: continua igual.
- **RXP, % Previsto, % Realizado**: continuam usando as mesmas bases, só recalculadas com o novo Previsto.
- **DRE Conciliação**: não tocar.
- Estrutura, ordem, cards, filtros, formato visual da DRE: **inalterados**.

### Implementação técnica
Arquivo único: `src/hooks/useDREData.ts`.

Na query `dre-previsto` (linhas 101–115), trocar o filtro para retornar também `is_paid` e `date`, e aplicar a regra em memória:

```ts
// query: traz expected_date no período + campos extras
.select('category_id, amount, type, is_paid, date')
.not('expected_date', 'is', null)
.gte('expected_date', startDate)
.lte('expected_date', endDate);

// filtro em memória antes de usar em sumPrevisto:
const previstoTxnsFiltered = previstoTxns.filter(t =>
  !t.is_paid || (t.date && t.date >= startDate && t.date <= endDate)
);
```

`sumPrevisto` passa a iterar sobre `previstoTxnsFiltered`.

### Arquivos alterados
- `src/hooks/useDREData.ts` — apenas a query do Previsto e o filtro em memória.