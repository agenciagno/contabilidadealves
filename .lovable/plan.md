

## Diagnóstico: Saldo total divergente da soma dos cards

### Causa raiz

Quando o saldo total é calculado com `bankId: 'all'`, as queries buscam **todas** as transações liquidadas — incluindo:

1. **Transações sem banco vinculado** (`bank_id = NULL`): não aparecem em nenhum card individual, mas inflam o total
2. **Transações de bancos inativos**: são somadas nas transações, mas o `baseBalance` (saldo inicial) só considera bancos ativos

Isso cria a divergência: Caixa Geral (R$ 0) + Sicoob (R$ 4.344) = R$ 4.344, mas o total mostra R$ 23.325 por incluir transações órfãs/inativas.

### Correção

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/hooks/useBankTransactions.ts` | Quando `bankId === 'all'`, filtrar as queries para incluir apenas transações cujo `bank_id` pertence a um dos bancos ativos (usando `.in('bank_id', activeBankIds)`) |
| 2 | `src/hooks/useBankTransactions.ts` | Garantir que `baseBalance` e as queries de transações usem exatamente o mesmo conjunto de bancos |

### Detalhes técnicos

No hook `useBankTransactions`, quando `bankId === 'all'`:
- Extrair `activeBankIds` da lista de bancos ativos passada como parâmetro
- Adicionar `.in('bank_id', activeBankIds)` em ambas as queries (prior e period)
- Isso garante que apenas transações vinculadas a bancos ativos sejam contabilizadas, excluindo transações com `bank_id = NULL` ou de bancos inativos

Resultado: o saldo total será a soma exata dos saldos individuais dos cards.

