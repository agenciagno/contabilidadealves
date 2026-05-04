## Objetivo

Alterar a lógica da "Versão Completa" no relatório Consulta Mensal para que a hierarquia seja **Evento Selecionado > Cliente/Fornecedor** (em vez de Evento Macro > Evento Filho). A versão resumida permanece inalterada (apenas eventos).

## Mudanças no arquivo `src/components/transactions/CashFlowReportModal.tsx`

### 1. Alterar o tipo `HierarchicalEvent` e o `useMemo` (linhas ~292-413)

- Renomear semanticamente: `macroName` passa a representar o nome do **Evento Contábil** (categoria da transação).
- `children` passa a representar os **Clientes/Fornecedores** vinculados àquele evento.
- Nova lógica de agrupamento:
  1. Filtrar transações pelo ano, status, categorias selecionadas e meses.
  2. Agrupar primeiro por `category_id`, depois dentro de cada categoria agrupar por `contact_id`.
  3. Cada grupo terá o nome do evento como header e os contatos como linhas filhas.
  4. Transações sem contato serão agrupadas como "Sem cliente/fornecedor".

### 2. Corrigir tipografia no PDF (linhas ~903-916)

- No `didDrawCell` para linhas `isChild`, remover o caractere `↳` do texto inserido via `doc.text()` e usar apenas indentação via `x + 6`.
- Ou manter `↳` mas garantir que o texto seja renderizado com `doc.text()` numa única chamada sem espaços iniciais, usando posicionamento `x` correto.
- Ajustar `charSpace` para 0 explicitamente: `doc.setCharSpace(0)` antes de desenhar o texto filho, garantindo espaçamento normal.

### 3. Atualizar exports XLS e CSV (linhas ~943-1001)

- Substituir referências a `macroName`/children pela nova estrutura (evento > contatos).
- Manter mesma formatação visual (macro bold, children indentados).

### 4. Atualizar preview summary (linha ~1325)

- Ajustar label de "X macros" para "X eventos" na contagem da versão completa.

## Resultado esperado

- **Versão Resumida**: Sem mudança — lista de eventos com valores mensais.
- **Versão Completa**: Evento como header (bold, fundo cinza), abaixo os clientes/fornecedores vinculados com valores mensais, tipografia limpa e sem espaçamento estranho.
