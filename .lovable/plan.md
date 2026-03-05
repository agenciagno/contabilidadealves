

## Plano: Tornar todos os campos obrigatórios (exceto Observações e Anexo)

### Situação atual
- `isFormValid` valida apenas: `amount > 0 && categoryId && bankId`
- Campos **Cliente/Fornecedor**, **Emissão**, **Vencimento**, **Prevista** e **Pagamento** não são obrigatórios
- Labels sem indicador visual `*` nos campos que deveriam ser obrigatórios

### Alterações em `src/components/transactions/TransactionFormDialog.tsx`

1. **Expandir `isFormValid`** para incluir todos os campos obrigatórios:
   ```typescript
   const isFormValid = parseCurrencyInput(amount) > 0 && categoryId && bankId && contactId && issueDate && dueDate && expectedDate && date;
   ```

2. **Adicionar indicador visual `*`** nas Labels dos campos:
   - Cliente/Fornecedor `*`
   - Emissão `*`
   - Vencimento `*`
   - Prevista `*`
   - Pagamento `*`
   
   (Valor, Evento Contábil e Banco já possuem `*`)

3. **Manter sem `*`**: Observações, Anexo, Valor Recebido/Pago (campo derivado)

### Arquivo impactado
- `src/components/transactions/TransactionFormDialog.tsx`

