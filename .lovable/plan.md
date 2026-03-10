

## Toggle de Condição de Pagamento no Modal de Nova Transação

### Alterações em `src/components/transactions/TransactionFormDialog.tsx`

**1. Novo estado `paymentCondition`**
- `const [paymentCondition, setPaymentCondition] = useState<'a_vista' | 'a_prazo'>('a_vista')`
- Resetar para `'a_vista'` no `useEffect` de reset (linha 113-119) e no `resetForm`
- Apenas visível/ativo no modo de criação (`!isEditing && !isSettleMode`)

**2. Toggle UI** — Logo abaixo do `<Tabs>` de tipo (linha 257), renderizar condicionalmente (apenas criação):
- Usar `<Tabs>` (mesmo componente já usado) com valores `a_vista` / `a_prazo`, labels "À Vista" e "À Prazo"
- Estilo compacto (`h-7 text-xs`)

**3. Variável derivada**
- `const isAPrazo = paymentCondition === 'a_prazo' && !isEditing && !isSettleMode`

**4. Ocultar campos no modo À Prazo**
- **Row 1 (linha 260)**: Renderizar condicionalmente a coluna "Valor Recebido/Valor Pago" — só mostrar se `!isAPrazo`. Ajustar grid para `grid-cols-2` quando oculto.
- **Row 3 datas (linha 337)**: Renderizar condicionalmente a coluna "Pagamento" — só mostrar se `!isAPrazo`. Ajustar grid para `grid-cols-3` quando oculto.

**5. Submit** — Quando `isAPrazo`, forçar `paid_amount: null`, `date: undefined`, `is_paid: false` no payload.

**6. Limpar valores ao trocar** — Ao mudar para `a_prazo`, limpar `paidAmount` e `date`. Ao mudar para `a_vista`, manter campos vazios (usuário preenche se quiser).

Nenhuma alteração em outros arquivos ou no banco de dados.

