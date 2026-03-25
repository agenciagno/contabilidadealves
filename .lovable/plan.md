

## Plano: Auditoria e Blindagem Completa do Banco Invisível

### Problemas Encontrados

| # | Local | Problema |
|---|---|---|
| 1 | `CashFlowTab.tsx` L451 | `activeBanks` não filtra `is_invisible` — card "Saldos Atuais" e `totalBankBalance` incluem bancos invisíveis |
| 2 | `Banks.tsx` L250 | Passa todos os `banks` ao `BankReportModal`, incluindo invisíveis |
| 3 | `BankReportModal.tsx` L400 | Lista de seleção de bancos inclui invisíveis |
| 4 | `useContactTransactions.ts` | Nenhum filtro de banco invisível — perfil do cliente mostra transações de bancos invisíveis |
| 5 | `BankDetailSheet.tsx` | Sem botão "Gerar Relatório" no extrato individual (regra 4) |

### Correções

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `src/components/transactions/CashFlowTab.tsx` | Filtrar `is_invisible` no `activeBanks` (L451): `banks.filter(b => b.is_active && !b.is_invisible)` |
| 2 | `src/pages/Banks.tsx` | Passar `banks.filter(b => !b.is_invisible)` ao `BankReportModal` |
| 3 | `src/hooks/useContactTransactions.ts` | Adicionar `bank_id` ao select e receber `invisibleBankIds` como parâmetro opcional; filtrar no cliente (ou via join) transações de bancos invisíveis |
| 4 | `src/components/banks/BankDetailSheet.tsx` | Adicionar botão "Gerar Relatório" que abre o `BankReportModal` travado no banco individual |

### Detalhes técnicos

**CashFlowTab (regra 1 e 2):**
```typescript
// Linha 451 — de:
const activeBanks = useMemo(() => banks.filter(b => b.is_active), [banks]);
// para:
const activeBanks = useMemo(() => banks.filter(b => b.is_active && !b.is_invisible), [banks]);
```
Isso corrige tanto o card "Saldos Atuais" quanto o `totalBankBalance` usado no cálculo do saldo acumulado.

**Banks.tsx → BankReportModal (regra 3):**
```typescript
// Linha 250 — de:
banks={banks}
// para:
banks={banks.filter(b => !b.is_invisible)}
```

**useContactTransactions (regra 2):**
Adicionar campo `bank_id` ao select e filtrar no retorno transações cujo `bank_id` pertença a bancos invisíveis. O componente `ContactFinancialTab` e `ContactProfile` já usam `useBanks`, então basta passar os IDs invisíveis e filtrar client-side.

**BankDetailSheet — Relatório Individual (regra 4):**
Adicionar um botão `<FileBarChart2>` no header do extrato individual que abre o `BankReportModal` com prop `banks` travado no array `[bank]` — o modal já suporta exatamente este cenário (seleção de banco único). Isso reusa 100% da estrutura visual existente.

### Resumo
- 4 arquivos editados
- 0 migrations
- Foco: fechar todos os vazamentos identificados na auditoria

