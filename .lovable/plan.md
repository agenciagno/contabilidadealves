

## Plano: Corrigir saldo e visual de extrato bancário

### Diagnóstico

Encontrei a causa exata da diferença de R$406,00: existe uma transação liquidada com data futura (05/06/2026, R$406,00 receita). A trigger do banco soma **todas** as transações pagas sem limite de data, inflando o `current_balance`. O extrato, que vai até hoje, não inclui essa transação — gerando a divergência.

Além disso, o período padrão está como "primeiro dia do mês atual" em vez de "01/01 do ano corrente", e o header do extrato individual mostra `current_balance` (all-time) em vez do saldo final do período.

### Correções

| # | Arquivo / Local | Mudança |
|---|---|---|
| 1 | **Trigger `update_bank_balance`** (migration SQL) | Adicionar `AND date <= CURRENT_DATE` para ignorar transações com data futura no cálculo do saldo |
| 2 | **`BankDetailSheet.tsx`** | Trocar `bank.current_balance` por `closingBalance` no header; mudar período padrão para 01/01 do ano |
| 3 | **`UnifiedStatementAccordion.tsx`** | Mudar período padrão para 01/01 do ano corrente |
| 4 | **`BankReportModal.tsx`** | Mudar período padrão para 01/01 do ano corrente |
| 5 | **`BankDetailSheet.tsx`** | Agrupar linhas do extrato por dia com separador visual (data como cabeçalho de grupo, saldo do dia ao lado) |
| 6 | **`UnifiedStatementAccordion.tsx`** | Mesma lógica de agrupamento por dia |

### Detalhes técnicos

**1. Trigger (SQL)**
```sql
AND date <= CURRENT_DATE
```
Adicionado nas 3 queries da trigger. Isso alinha `current_balance` com a realidade do extrato até hoje.

**2-4. Período padrão**
```ts
// De:
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
// Para:
const firstOfYear = new Date(today.getFullYear(), 0, 1)
```

**5-6. Agrupamento por dia (visual)**
As linhas do extrato serão agrupadas por data. Cada grupo terá:
- Um cabeçalho com a data (ex: "Qua, 02/01/2026") e o saldo final daquele dia
- As transações do dia listadas abaixo sem repetir a coluna de data
- Separador visual entre grupos de dias

Inspirado no layout do anexo 3 (extrato real do Sicoob).

