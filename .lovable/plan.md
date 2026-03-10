

## Plano: 3 Alterações Pontuais

### 1. Excluir aba "Relatórios"
- **`src/components/layout/AppSidebar.tsx`**: Remover o módulo "Relatórios" do array `menuModules` (linhas 105-112).
- **`src/App.tsx`**: Remover a rota `/relatorios` (linha 51), o import de `Reports` (linha 23), e deletar `src/pages/Reports.tsx`.

### 2. Default "Receita" no modal de Nova Transação
- **`src/components/transactions/TransactionFormDialog.tsx`** (linha 50): Alterar `defaultType = 'despesa'` para `defaultType = 'receita'`.
- Verificar se os chamadores passam `defaultType` explicitamente — se sim, ajustar também.

### 3. Campos pagamento desabilitados apenas em edição (não em criação)
Lógica atual: `disabled={!isSettleMode}` nos campos Valor Pago e Data Pagamento — bloqueia tanto criação quanto edição.

Nova lógica: `disabled={isEditing && !isSettleMode}` — libera na criação, bloqueia na edição (exceto modo liquidar).

**Arquivos alterados:**
- `src/components/transactions/TransactionFormDialog.tsx` (linhas 291, 358)
- `src/components/layout/AppSidebar.tsx`
- `src/App.tsx`
- Deletar `src/pages/Reports.tsx`

