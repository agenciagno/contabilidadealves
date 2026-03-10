

## Correção: Botões Salvar vs Salvar e Fechar

**Problema**: O `handleSubmit` em `Transactions.tsx` (linha 495) sempre executa `setDialogOpen(false)` após criar uma transação, ignorando a lógica interna do modal que diferencia "Salvar" (manter aberto) de "Salvar e Fechar".

**Solução**: Passar a informação de qual ação foi escolhida do modal para o handler pai, para que ele só feche o dialog quando for "Salvar e Fechar".

### Alterações

**1. `TransactionFormDialog.tsx`** — Alterar a assinatura de `onSubmit` para incluir um terceiro parâmetro `shouldClose: boolean`:
- Interface: `onSubmit: (data: TransactionInsert, pendingFiles?: File[], shouldClose?: boolean) => void`
- No `handleSubmit`, passar `saveActionRef.current === 'close'` como terceiro argumento
- Remover a lógica interna de `resetForm()` / `onOpenChange(false)` após o `onSubmit` — o pai controla isso

**2. `Transactions.tsx`** — Atualizar `handleSubmit` para receber `shouldClose`:
- Na branch de criação (`else`), no `onSuccess`: se `shouldClose` for `false`, chamar `setEditingTransaction(null)` sem fechar o dialog (reseta o form via mudança de estado). Se `true`, fechar com `setDialogOpen(false)`.
- Na branch de edição, manter `setDialogOpen(false)` sempre (edição sempre fecha).

