

## Plano: Implementar "Banco Invisível" para Antecipação de Títulos

### Resumo

Renomear `is_caixa_geral` para `is_invisible` na tabela `banks`, atualizar o modal de banco, isolar saldo de bancos invisíveis do total global, adicionar badge visual nos cards, e filtrar transações de bancos invisíveis de todas as queries globais (exceto extrato individual).

### Mudanças

| # | Arquivo / Recurso | Mudança |
|---|---|---|
| 1 | **Migration SQL** | Renomear coluna `is_caixa_geral` → `is_invisible` com `ALTER TABLE banks RENAME COLUMN` |
| 2 | `src/hooks/useBanks.ts` | Renomear `is_caixa_geral` → `is_invisible` na interface `Bank` e tipos derivados |
| 3 | `src/components/banks/BankFormDialog.tsx` | Trocar label de "Marcar como Caixa Geral" para "Banco Invisível" e usar `is_invisible` |
| 4 | `src/pages/Banks.tsx` | (a) Excluir bancos `is_invisible` do cálculo de saldo total; (b) Adicionar badge vermelha "Invisível" nos cards de bancos marcados; (c) Atualizar `handleSubmit` para `is_invisible` |
| 5 | `src/hooks/useServerTransactions.ts` | Adicionar `invisibleBankIds` ao `ServerFilters`; no `applyFilters`, quando `bankId` não for específico, excluir transações com `bank_id` em bancos invisíveis via `.not('bank_id', 'in', (...))` |
| 6 | `src/hooks/useTransactions.ts` | Receber lista de `invisibleBankIds` e filtrar transações de bancos invisíveis na query |
| 7 | `src/hooks/useReportData.ts` | Excluir transações de bancos invisíveis da query de relatórios |
| 8 | `src/hooks/useCashFlowForecast.ts` | Excluir bancos invisíveis do `currentBalance` e transações pendentes |
| 9 | `src/components/banks/UnifiedStatementAccordion.tsx` | No extrato unificado, excluir bancos invisíveis |
| 10 | `src/hooks/useBankTransactions.ts` | No modo `bankId: 'all'`, excluir bancos invisíveis do `activeBankIds` |
| 11 | `src/pages/Transactions.tsx` | Atualizar ref a `is_caixa_geral` → `is_invisible` |
| 12 | `src/pages/Dashboard.tsx` | Atualizar ref a `is_caixa_geral` → `is_invisible` |
| 13 | `src/contexts/NotificationContext.tsx` | Excluir transações de bancos invisíveis das notificações de inadimplência |

### Detalhes técnicos

**Migration:**
```sql
ALTER TABLE public.banks RENAME COLUMN is_caixa_geral TO is_invisible;
```

**Estratégia de filtragem global:** Criar um hook utilitário ou exportar uma função que retorna os IDs dos bancos invisíveis a partir do cache de `useBanks`. Nas queries que já usam `useBanks` (maioria), filtrar com:
```typescript
const invisibleIds = banks.filter(b => b.is_invisible).map(b => b.id);
// Na query: .not('bank_id', 'in', `(${invisibleIds.join(',')})`)
```

**Exceção — Extrato Individual:** O `BankDetailSheet` já chama `useBankTransactions` com `bankId` específico (não `'all'`), então automaticamente busca apenas transações daquele banco. Nenhuma alteração necessária nesse componente.

**Saldo Total (Banks.tsx):** Filtrar `activeBankIds` passado ao `useBankTransactions` removendo os invisíveis, e ajustar o `baseBalance` para não somar `initial_balance` de bancos invisíveis.

**Badge visual:** No `BankCard`, se `bank.is_invisible`, renderizar `<Badge variant="destructive">Invisível</Badge>` ao lado do nome.

