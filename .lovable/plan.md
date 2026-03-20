

## Plano: Adicionar paginação iterativa nas queries do useBankTransactions

### Causa raiz

Ambas as queries (prior e period) não usam `.range()` e estão sujeitas ao limite padrão de 1000 registros do banco de dados. Se houver mais de 1000 transações no período ou anteriores, o saldo será calculado incorretamente.

### Mudança

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/hooks/useBankTransactions.ts` | Criar função auxiliar `fetchAllRows` que busca registros iterativamente usando `.range(offset, offset+pageSize-1)` até que não haja mais dados |
| 2 | `src/hooks/useBankTransactions.ts` | Aplicar `fetchAllRows` nas duas queries (prior e period) |

### Detalhes técnicos

Criar uma função genérica de paginação:

```typescript
async function fetchAllRows(baseQuery: any, pageSize = 1000) {
  let allData: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await baseQuery.range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return allData;
}
```

Como `.range()` não pode ser chamado num query já executado, a abordagem será construir a query base sem executá-la e passar para `fetchAllRows`. Ambas as queryFn serão atualizadas para usar este padrão.

