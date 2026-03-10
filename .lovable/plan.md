

## Correção: Botão "Nova Movimentação" chama com tipo 'despesa'

**Problema**: Na página Movimentações, o botão "Nova Movimentação" (linha 581) chama `handleNewTransaction('despesa')`, forçando o tipo despesa independente do estado inicial.

**Alteração**:
- `src/pages/Transactions.tsx` linha 581: Trocar `handleNewTransaction('despesa')` para `handleNewTransaction('receita')`.

