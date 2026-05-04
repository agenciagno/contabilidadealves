
## Objetivo

Adicionar um toggle "Recorrente / Parcelado" ao modal de Nova Transação em `/movimentacoes`. Quando ativado, permite configurar parcelas mensais e gera automaticamente N transações no banco de dados.

## Alterações

### 1. Novo hook: `src/hooks/useInstallments.ts`

Hook utilitário que encapsula a lógica de geração de parcelas:

- Função `generateInstallments(basePayload, count)`: recebe o payload base da transação e o número de parcelas, retorna array de `TransactionInsert[]` com datas incrementadas mês a mês.
- Lógica de incremento: preserva o dia do mês base; se o dia não existir no mês destino (ex: 31 em fevereiro), usa o último dia do mês.
- Parcela 1 = datas originais. Parcelas 2..N = +1, +2... meses sobre `due_date`, `expected_date` e `date` (se preenchido).
- Função `calculateSummary(dueDate, mode, value)`: retorna `{ count, firstDate, lastDate }` para o resumo dinâmico.

### 2. Editar: `src/components/transactions/TransactionFormDialog.tsx`

**Novos estados:**
- `isRecurring` (boolean, default false)
- `endMode` ('parcelas' | 'data_final')
- `installmentCount` (number)
- `endDate` (string)

**UI — Toggle (após linha de datas, antes de Anexo/Histórico):**
- Switch com label "Recorrente / Parcelado", visível apenas para novas transações (não em edição/liquidação).
- Quando OFF: nenhum campo extra.
- Quando ON: seção com borda sutil (`border rounded-md p-4 bg-muted/30`) contendo:
  - RadioGroup: "Quantidade de Parcelas" / "Data Final"
  - Input numérico (min=2) ou DatePicker conforme seleção
  - Resumo dinâmico: "X parcelas · Primeira em DD/MM/AAAA · Última em DD/MM/AAAA"
- Animação suave de entrada (transição de altura + opacidade).
- Ao desativar: limpa todos os campos de recorrência.

**Validação:**
- Vencimento obrigatório quando toggle ativo.
- Nº de parcelas >= 2.
- Data final posterior ao mês do Vencimento base.
- Botões "Salvar" / "Salvar e Fechar" bloqueados se campos de recorrência inválidos.

**Lógica de salvamento:**
- Quando toggle ativo: gera array de parcelas via `generateInstallments`.
- Usa a mutation `bulkCreateTransactions` já existente no hook `useTransactions` (linha 310) para batch insert.
- Toast de sucesso: "X transações criadas com sucesso."
- Toast de erro em caso de falha.
- Loading: desabilita botões durante o insert.

### 3. Editar: `src/pages/Transactions.tsx`

- Expor `bulkCreateTransactions` do hook `useTransactions` no componente.
- Passar como prop ou usar callback no `handleSubmit` para suportar o batch insert quando recorrência estiver ativa.
- Alternativa: o `TransactionFormDialog` pode importar `useTransactions` diretamente para o bulk insert, mantendo a interface `onSubmit` existente para transações individuais.

## Detalhes Técnicos

- O incremento de meses usará a API nativa de `Date` com tratamento de overflow de dias (ex: `new Date(2026, month, 0).getDate()` para último dia do mês).
- A seção de recorrência será envolta em um `div` com `overflow-hidden` e transição CSS para animação suave.
- O toggle só aparece em modo criação (não em edição ou liquidação).
- Nenhum campo existente será alterado.
