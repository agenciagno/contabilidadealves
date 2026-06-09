## Reverter regra "À Vista" — manter apenas indicador visual

### Contexto
A introdução de `is_cash` + `expected_date` na lógica da Conciliação quebrou o relatório (volta vazio). Vamos remover essas regras do back de cálculo e deixar a marcação À Vista somente como um detalhe visual nos Lançamentos.

### O que muda

**1. Conciliação (`DREConciliationModal.tsx`)**
- Voltar à query original baseada apenas em `date` (data de pagamento/competência) dentro do período, como antes da mudança — sem `expected_date`, sem `is_cash`, sem OR ampliado.
- Remover a coluna "À Vista / Possível À Vista" e a coluna "Realizado fora do Previsto".
- Remover qualquer classificação (`Previsto` / `Realizado fora do Previsto` / `Ambos`) — volta ao formato simples anterior.
- DRE (`useDREData`) e Pagar/Receber permanecem intocados.

**2. Lançamentos (`Transactions.tsx`)**
- Remover a coluna "À Vista / Possível À Vista" da tabela e qualquer filtro relacionado.
- Manter um indicador visual sutil (badge pequeno "À Vista" ou ícone) ao lado do valor/descrição, exibido somente quando a transação atender à condição visual de À Vista (mesma data de emissão, vencimento e pagamento, e `is_paid = true`) — derivado em runtime, sem depender da coluna `is_cash`.
- Esse badge é puramente decorativo. Não filtra, não soma, não afeta KPIs, DRE ou Conciliação.

**3. Form de Transação (`TransactionFormDialog.tsx`)**
- Remover qualquer campo/toggle ligado a `is_cash` ou marcação manual de À Vista. O form volta ao estado anterior à mudança.

**4. Banco de dados**
- A coluna `is_cash` (e `expected_date`, se criada junto) deixa de ser usada pelo app. Posso:
  - **(a)** Deixar a coluna no schema, sem uso — zero risco, fica como legado.
  - **(b)** Criar migração para dropar `is_cash` (e `expected_date` se aplicável).
  
  Preciso da sua confirmação antes de dropar qualquer coluna.

### Filtros da Conciliação
Os filtros nos cabeçalhos das colunas (padrão Lançamentos) que acabamos de implementar **continuam**. Só somem os filtros das colunas que estão sendo removidas ("À Vista", "Realizado fora do Previsto").

### Arquivos a alterar
- `src/components/reports/DREConciliationModal.tsx` — query e colunas voltam ao formato pré-mudança; mantém filtros nos cabeçalhos.
- `src/pages/Transactions.tsx` — remove coluna À Vista, adiciona badge visual derivado.
- `src/components/transactions/TransactionFormDialog.tsx` — remove campo `is_cash`.
- (Opcional) Migração para dropar `is_cash` / `expected_date`.

### Pergunta antes de executar
A coluna `is_cash` no banco: **dropar** ou **deixar como legado sem uso**?