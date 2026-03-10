

## Correção: Limpar campos do modal após "Salvar"

**Problema**: Ao criar uma nova transação, `editingTransaction` já é `null`. Quando o "Salvar" chama `setEditingTransaction(null)` no pai, o valor não muda, então o `useEffect` do formulário não dispara e os campos permanecem preenchidos.

**Solução**: Adicionar um contador de reset no pai que incrementa ao salvar sem fechar. Passar esse contador como prop ao modal, incluindo-o como dependência do `useEffect` de reset.

### Alterações

**1. `src/pages/Transactions.tsx`**:
- Criar estado `const [formResetKey, setFormResetKey] = useState(0)`
- No `onSuccess` da criação quando `shouldClose === false`: chamar `setFormResetKey(k => k + 1)`
- Passar `resetKey={formResetKey}` como prop ao `TransactionFormDialog`

**2. `src/components/transactions/TransactionFormDialog.tsx`**:
- Adicionar `resetKey?: number` na interface de props
- Incluir `resetKey` como dependência do `useEffect` que reseta o formulário (linha 98)

