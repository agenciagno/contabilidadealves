

## Plano: Corrigir filtro de banco invisível que oculta transações pendentes

### Causa raiz

Os dados estão intactos no banco (2249 pendentes, 0 deletadas). O problema foi introduzido na implementação do "Banco Invisível": o filtro `.not('bank_id', 'in', '(uuid)')` gera `bank_id NOT IN (...)` em SQL. Em PostgreSQL, quando `bank_id` é `NULL`, essa expressão retorna `NULL` (não `TRUE`), excluindo silenciosamente todas as 2249 transações sem banco vinculado.

### Correção

Substituir `.not('bank_id', 'in', ...)` por `.or('bank_id.is.null,...')` em 4 arquivos:

| # | Arquivo | Linha |
|---|---|---|
| 1 | `src/hooks/useServerTransactions.ts` | L103 |
| 2 | `src/hooks/useReportData.ts` | L76 |
| 3 | `src/hooks/useCashFlowForecast.ts` | L89 |
| 4 | `src/hooks/useContactTransactions.ts` | L44 |

### Lógica corrigida (mesmo padrão nos 4 arquivos)

De:
```typescript
query = query.not('bank_id', 'in', `(${invisibleBankIds.join(',')})`);
```

Para:
```typescript
query = query.or(`bank_id.is.null,${invisibleBankIds.map(id => `bank_id.neq.${id}`).join(',')}`);
```

Ou, de forma mais limpa usando a sintaxe `not.in` combinada com `or` para preservar NULLs:
```typescript
// Exclude invisible banks but keep bank_id IS NULL
const notInFilter = invisibleBankIds.map(id => `bank_id.neq.${id}`).join(',');
query = query.or(`bank_id.is.null,and(${notInFilter})`);
```

### Impacto
- 4 arquivos editados, mesma correção aplicada
- 0 migrations
- As 2249 transações pendentes voltarão a aparecer imediatamente

