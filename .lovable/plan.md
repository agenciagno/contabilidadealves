

## Correção: Default "Receita" na página Movimentações

**Problema**: Em `src/pages/Transactions.tsx` (linha 427), o estado `defaultType` é inicializado como `'despesa'`, sobrescrevendo o default do componente.

**Alteração**:
- `src/pages/Transactions.tsx` linha 427: Trocar `useState<'receita' | 'despesa'>('despesa')` para `useState<'receita' | 'despesa'>('receita')`.

