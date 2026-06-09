# Plano: Identificação À Vista + Filtros na Conciliação

## 1. Identificação de transações À Vista

Hoje o sistema **não guarda** se uma transação foi lançada como "À Vista" — essa escolha existe só no formulário, no momento do lançamento, e some depois. Por isso a Conciliação precisa usar uma heurística ("Provável À Vista") para tentar adivinhar.

A correção é simples: passar a **gravar** essa marcação no banco.

### O que muda

**Banco de dados (`transactions`)**
- Nova coluna `is_cash` (boolean, default `false`).
- Migration retroativa: marcar `is_cash = true` em transações antigas que batam na heurística atual (pagas, com data prevista preenchida, e `expected_date = date`). Isso transforma a "suspeita" em fato registrado, de uma vez. Transações que não batam ficam como À Prazo (`false`) — exatamente como hoje.

**Formulário (`TransactionFormDialog.tsx`)**
- Ao salvar com a aba **À Vista**, grava `is_cash = true`.
- Ao salvar com **À Prazo**, grava `is_cash = false`.
- Ao editar, o formulário lê `is_cash` e abre na aba correspondente (hoje ele sempre cai em À Prazo na edição).

**Identificação visual (simples, conforme pedido — só para À Vista)**
- Pequeno selo **"À Vista"** nas linhas onde `is_cash = true`, exibido em:
  - Tabela principal de Transações (`Transactions.tsx`).
  - Tabela do Pagar/Receber (`PagarReceber.tsx`).
  - Detalhe expandido da Conciliação DRE.
- À Prazo continua **sem** selo (visual idêntico ao atual).

**Conciliação DRE**
- A coluna "Suspeitas À Vista" e o selo "Provável À Vista" passam a usar **`is_cash = true`** como fonte da verdade (em vez da heurística). O nome da coluna muda para **"À Vista"** (não é mais "suspeita" — é fato).
- A regra de cálculo da DRE e do Pagar/Receber **não muda**. À Vista continua: zera `expected_date`, não compõe Previsto, compõe Realizado.

### Não muda
- Nenhuma fórmula de DRE, Pagar/Receber ou KPI.
- Nenhuma RLS, política ou estrutura de outra tabela.
- Filtros, paginação, ordenação existentes.

---

## 2. Filtros na Conciliação DRE

A Conciliação hoje só tem o filtro de período do modal. Vou adicionar filtros por coluna no padrão dos demais relatórios do sistema (mesmo visual do `UnifiedFilterBox`: linha de filtros acima da tabela, com `Select` para dimensões e busca por texto).

### Filtros adicionados (no topo do modal, acima da tabela principal)

| Filtro | Tipo | Aplica em |
|---|---|---|
| Busca | texto | Descrição, contato, banco, evento (filtra os detalhes; grupos sem match somem) |
| Evento Contábil (macro) | select | Linha da tabela principal |
| Cliente/Fornecedor | select | Transações no detalhe |
| Conta Corrente | select | Transações no detalhe |
| Status | select (Todos / Pago / Em aberto) | Transações no detalhe |
| Tipo | select (Todos / Receita / Despesa) | Transações no detalhe |
| Marcador À Vista | select (Todos / Só À Vista / Só À Prazo) | Transações no detalhe |

Regras:
- Filtros são **combinados** (AND), como nos outros relatórios.
- Quando um filtro de detalhe (ex.: contato, banco) é aplicado, os **totais por grupo** e os **totais gerais** são recalculados considerando só as transações que sobreviveram ao filtro — assim a Conciliação continua batendo com o que está visível.
- Grupos que ficam vazios após filtro são ocultados.
- Botão **"Limpar filtros"** restaura o estado inicial, igual aos outros filtros do sistema.
- Padrão visual: reuso dos componentes `Select`, `Input`, `Button` já usados no `UnifiedFilterBox`. Não vou criar um novo design.

### Não muda
- O período continua vindo do filtro existente do modal.
- Lógica de comparação (Previsto DRE × Em Aberto × Pagas c/ Prevista × Diferença) intocada — só passa a operar sobre o subconjunto filtrado.
- Ações em massa (Limpar Data Prevista, Editar em massa) continuam funcionando sobre o que está selecionado.

---

## Arquivos a alterar

- **Migration**: nova coluna `transactions.is_cash` + backfill via heurística.
- `src/components/transactions/TransactionFormDialog.tsx` — gravar/ler `is_cash`.
- `src/components/reports/DREConciliationModal.tsx` — usar `is_cash`, adicionar barra de filtros, recalcular totais filtrados.
- `src/pages/Transactions.tsx`, `src/pages/PagarReceber.tsx` — exibir selo "À Vista".
- `src/integrations/supabase/types.ts` — regenerado automaticamente após a migration.

Posso seguir?
