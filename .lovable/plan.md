

## Plano: Botão Liquidar na Tabela + Correção dos Modos Edit/Settle

### Alterações

**Arquivo 1: `src/pages/Transactions.tsx`**

1. **Novo estado `dialogMode`**: Adicionar `const [dialogMode, setDialogMode] = useState<'edit' | 'settle'>('edit');`

2. **Nova função `handleSettle`**: Similar a `handleEdit`, mas define `dialogMode = 'settle'`:
   ```ts
   const handleSettle = (transaction: Transaction) => {
     setEditingTransaction(transaction);
     setDialogMode('settle');
     setDialogOpen(true);
   };
   ```

3. **Ajustar `handleEdit`** para resetar `dialogMode = 'edit'` e `handleNewTransaction` também.

4. **Botão Liquidar na tabela** (linha 897-900): Adicionar um ícone `CircleDollarSign` entre o Pencil e o Trash2:
   ```tsx
   <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-500/10"
     onClick={() => handleSettle(transaction)}>
     <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" />
   </Button>
   ```

5. **Passar `mode={dialogMode}`** ao `TransactionFormDialog` (linha 920-930).

6. **Ajustar largura da grid do header e rows** para acomodar a coluna de ações mais larga (ou manter se couber).

---

**Arquivo 2: `src/components/transactions/TransactionFormDialog.tsx`**

7. **Modo Edit: remover `structuralDisabled`** — no modo edit, `structuralDisabled` deve ser `false` (atualmente é `isEditing || isSettleMode`, o que bloqueia campos ao editar). Alterar para:
   ```ts
   const structuralDisabled = isSettleMode; // apenas settle bloqueia campos estruturais
   ```
   Isso desbloqueia todos os campos no modo edit, mesmo ao editar uma transação existente.

8. Sem outras alterações no modal — validação e submit já estão corretos para ambos os modos.

### Resumo
- 2 ficheiros alterados
- Novo ícone `CircleDollarSign` na coluna de ações
- `structuralDisabled` deixa de considerar `isEditing`, apenas `isSettleMode`
- Estado `dialogMode` controla qual modo o modal abre

