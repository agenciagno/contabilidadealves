

## Plano: 5 Alterações Pontuais

### 1. Inversão dos Botões Receita/Despesa
**Arquivo: `TransactionFormDialog.tsx`** (linhas 221-226)
- Trocar a ordem: `receita` primeiro (esquerda), `despesa` segundo (direita).

### 2. Bloquear Valor Pago e Data Pagamento em Criar/Editar
**Arquivo: `TransactionFormDialog.tsx`**
- Campo "Valor Recebido/Pago" (linha 259): adicionar `disabled={!isSettleMode}`
- Campo "Pagamento" data (linha 326): adicionar `disabled={!isSettleMode}`

### 3. Dois Botões: "Salvar" e "Salvar e Fechar"
**Arquivo: `TransactionFormDialog.tsx`**
- Adicionar prop `onSaveAndContinue` ao componente (callback opcional).
- Adicionar estado `saveAction` (`'close'` | `'continue'`).
- No `handleSubmit`, após chamar `onSubmit`, verificar a ação:
  - **"Salvar e Fechar"**: comportamento atual (submete e fecha via `onOpenChange(false)`).
  - **"Salvar"**: submete, depois reseta todos os campos para valores iniciais, mantém modal aberto.
- Substituir o botão único por dois botões (apenas no modo criar/editar, não no modo liquidar).
- O reset dos campos será feito internamente no componente após o submit.
- Alterar a prop `onSubmit` para aceitar um callback de sucesso ou usar Promise. Alternativa mais simples: o componente reseta imediatamente após chamar onSubmit e delega o fechamento ao `saveAction`.

**Arquivos consumidores** (`Transactions.tsx`, `Dashboard.tsx`, `Home.tsx`): sem alterações necessárias, pois o `onOpenChange(false)` já é controlado pelo dialog.

### 4. Validação de Datas (YYYY-MM-DD)
**Arquivo: `src/lib/utils.ts`** — Criar função `isValidDateString(value: string): boolean` que valida formato YYYY-MM-DD com dia 01-31, mês 01-12, ano 4 dígitos.

**Arquivo: `TransactionFormDialog.tsx`** — No `handleSubmit`, validar `issueDate`, `dueDate`, `expectedDate`, `date` (quando preenchido) com a função acima. Exibir toast de erro se inválido.

Como os inputs são `type="date"` nativos do browser, eles já restringem o formato. A validação será uma camada extra de segurança no submit.

### 5. Limpar Página de Relatórios
**Arquivo: `src/pages/Reports.tsx`** — Substituir todo o conteúdo por uma página vazia com apenas o título "Relatórios" e uma mensagem placeholder.

