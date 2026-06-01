## Objetivo

Adicionar as opções **Data de Vencimento** e **Data Prevista** ao diálogo de edição em lote de lançamentos (`BulkEditDialog`), mantendo o mesmo padrão visual e funcional dos campos existentes (Cliente/Fornecedor, Evento Contábil, Conta/Banco).

## Arquivo afetado

- `src/components/transactions/BulkEditDialog.tsx` (único arquivo alterado)

## Mudanças

1. Expandir o tipo `FieldOption` para incluir `'due_date' | 'expected_date'`.
2. Adicionar dois novos itens no `Select` "Qual campo deseja alterar?":
   - **Data de Vencimento** (`due_date`)
   - **Data Prevista** (`expected_date`)
3. Quando um desses campos for selecionado, renderizar um **DatePicker** (Popover + Calendar do shadcn, mesmo padrão já usado em `BulkEditCalendarDialog.tsx`) com label apropriado.
4. Converter a data escolhida para formato `YYYY-MM-DD` antes de enviar no `update({ [field]: value })`.
5. Nenhuma alteração em lógica, queries, mutations, RLS, schema ou nas invalidações já existentes — apenas adição dos dois campos.

## Fora de escopo

- Não alterar `data` (data do pagamento), `is_paid`, valores ou qualquer outro campo.
- Não mexer em filtros, tabela, ordenação ou demais componentes.
- Sem migrations.

Posso prosseguir?