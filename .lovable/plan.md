## Ajustes visuais na página de Movimentações e Modal

### 1. Checkboxes de seleção menores (tabela)
**Arquivo:** `src/pages/Transactions.tsx`
- Reduzir coluna de checkbox de `24px` para `18px` no grid-cols do header e rows.
- Reduzir o checkbox do header (linha 1040) para `h-3.5 w-3.5`.
- Reduzir o checkbox das rows (linha 1112) de `h-[18px] w-[18px]` para `h-3.5 w-3.5`.

### 2. Ícones de filtro em "Vencimento" e "Pagamento" cortados
**Arquivo:** `src/pages/Transactions.tsx`
- As colunas de data (Vencimento, Prevista, Pagamento) estão com `88px` -- o texto + ícone de filtro não cabem. Aumentar para `96px` cada uma.
- Alternativamente, reduzir o texto com `text-[10px]` e manter layout. A abordagem será aumentar as 3 colunas de data de `88px` para `96px`.

### 3. Badge "Pago" com largura mínima igual a "Pendente"
**Arquivo:** `src/pages/Transactions.tsx` (linha ~1139)
- Adicionar `min-w-[68px] text-center` ao botão de status para que "Pago" e "Pendente" fiquem com o mesmo tamanho visual.

### 4. Reduzir gaps do modal para evitar scroll
**Arquivo:** `src/components/transactions/TransactionFormDialog.tsx`
- Reduzir `space-y-5` do form (linha 448) para `space-y-3`.
- Reduzir `p-6` do DialogContent (linha 444) para `p-5`.
- Reduzir `pb-2` do DialogHeader para `pb-1`.
- Reduzir `gap-3` dos grids internos para `gap-2`.
- Estas mesmas mudanças se aplicam automaticamente ao tablet, pois o modal já é responsivo.
