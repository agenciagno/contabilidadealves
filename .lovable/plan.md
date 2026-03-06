

## Plano: Modal com Dois Modos (Editar / Liquidar)

### Contexto
Atualmente o `TransactionFormDialog` tem um único modo. Não existe conceito de "modo Liquidar". Precisamos adicionar uma prop `mode` e ajustar validação, disabled states e nomenclatura.

### Alterações

**Arquivo: `src/components/transactions/TransactionFormDialog.tsx`**

1. **Nova prop `mode`**: Adicionar `mode?: 'edit' | 'settle'` (default `'edit'`) à interface `TransactionFormDialogProps`.

2. **BLOCO 1 — Renomear "Observações" → "Histórico"**: Alterar o label na linha 300 e o placeholder.

3. **BLOCO 2 — Validação modo Editar**: Alterar `isFormValid` (linha 172) para:
   - Obrigatórios: `amount > 0`, `contactId`, `categoryId`, `issueDate`, `dueDate`, `expectedDate`
   - Remover `bankId`, `date` da validação obrigatória
   - Banco, Data Pagamento, Valor Pago e Histórico ficam opcionais

4. **BLOCO 3 — Modo Liquidar (UI)**:
   - Título do dialog: `'Liquidar Transação'` quando `mode === 'settle'`
   - Campos estruturais desabilitados (`disabled={isSettleMode}`): Tipo, Cliente, Valor original, Evento Contábil, Emissão, Vencimento, Prevista, Histórico, Anexo
   - Campos habilitados: Valor Pago/Recebido, Conta/Banco, Data Pagamento
   - Validação do botão submit no modo settle: `parseCurrencyInput(paidAmount) > 0 && bankId && date`
   - Texto do botão: `'Liquidar'` em vez de `'Salvar'`
   - Remover asterisco do label "Pagamento" no modo edit (é opcional); adicionar no modo settle

5. **BLOCO 4 — Submit no modo Liquidar**: No `handleSubmit`, quando `mode === 'settle'`, forçar `is_paid: true` no payload independentemente da derivação.

**Arquivos consumidores: `Transactions.tsx`, `Dashboard.tsx`, `Home.tsx`**

6. Adicionar suporte à prop `mode` nos locais que abrem o dialog para edição/liquidação. Se já existir um botão ou ação de "liquidar" na tabela, passar `mode="settle"`. Caso contrário, manter `mode="edit"` (default) — nenhuma alteração necessária nos consumidores existentes por ora, pois o default é `'edit'`.

### Resumo de impacto
- **Arquivo principal**: `src/components/transactions/TransactionFormDialog.tsx`
- **Consumidores**: Sem alteração obrigatória (default = edit), mas prontos para passar `mode="settle"` quando necessário

