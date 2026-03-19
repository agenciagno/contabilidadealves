

## Plano: Ajustes visuais e de saldo no extrato bancário

### Mudanças

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `BankDetailSheet.tsx` | Inverter ordem dos `dayGroups` (`.reverse()`) para mais recentes no topo |
| 2 | `BankDetailSheet.tsx` | Adicionar "Saldo " antes do valor no cabeçalho de cada dia |
| 3 | `BankDetailSheet.tsx` | Trocar posições: "Saldo Final do Período" vai para o topo, "Saldo Inicial do Período" vai para o final |
| 4 | `UnifiedStatementAccordion.tsx` | Mesmas 3 mudanças acima |
| 5 | `Banks.tsx` | Substituir `bank.current_balance` no card por `closingBalance` calculado pelo hook, para que o "Saldo Atual" do card corresponda ao valor exibido no header do extrato individual |

### Detalhes

**Inversão de ordem**: `dayGroups.reverse()` — os dias mais recentes aparecem primeiro na lista. Dentro de cada dia, a ordem das transações se mantém cronológica.

**"Saldo" no cabeçalho do dia**: De `{formatCurrency(group.dayBalance)}` para `Saldo {formatCurrency(group.dayBalance)}`.

**Inversão Saldo Inicial/Final**: O "Saldo Final do Período" aparece no topo da lista (antes dos grupos de dias) e o "Saldo Inicial do Período" aparece no final (após os grupos). Isso faz sentido com a ordem invertida (mais recente primeiro).

**Card = Extrato**: Para o card na página principal mostrar o mesmo valor do extrato, precisarei usar `useBankTransactions` dentro do componente `BankCard` (ou calcular via query) com o período padrão (01/01 do ano até hoje). Isso substitui `bank.current_balance` pelo `closingBalance` calculado pelo hook.

