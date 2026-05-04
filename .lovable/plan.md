
## Objetivo

Alterar a tabela de Movimentações para a nova ordem de colunas:

**CLIENTE/FORNECEDOR | EVENTO CONTÁBIL | VENCIMENTO | PREVISTA | PAGAMENTO | STATUS | VALOR | RECEBIDO | AÇÕES**

---

## Alterações em `src/pages/Transactions.tsx`

### 1. Remover coluna "Emissão"

- Remover o cabeçalho "Emissão" com seu `DateColumnFilter` (linhas ~997-1003).
- Remover a célula `issue_date` nas linhas de dados (linha ~1071).
- Manter os filtros de `issue_date` no `ColumnFilters` interface (podem ser usados internamente), mas a coluna visual desaparece.

### 2. Renomear "Cliente / Evento" para "Cliente"

- No componente `ContactEventMultiFilter`, alterar o label de `"Cliente / Evento"` para `"Cliente"`.
- Remover a seção "Eventos (sem contato)" do filtro, mantendo apenas a listagem de Clientes/Fornecedores.
- Remover `uniqueEventOptions`, `tempEvents`, `selectedEvents` e a lógica de `eventNames` desse componente.

### 3. Remover informação de Evento Contábil da célula "Cliente"

- Na célula da coluna Cliente (linhas ~1072-1086), remover a exibição de `transaction.category.name` (o Evento Contábil que aparece abaixo do nome do cliente).
- Manter apenas: nome do contato/descrição, badge "Vencido", banco e tipo (Receita/Despesa).

### 4. Adicionar nova coluna "Evento Contábil"

- Inserir uma nova coluna entre "Cliente" e "Vencimento".
- **Cabeçalho**: Criar um filtro multi-select idêntico ao filtro de "Cliente" (mesmo visual, com busca por texto, checkboxes, badge de contagem). Esse filtro usará a lista de `categories` e filtrará por `category_id`.
- **Célula**: Exibir `transaction.category?.name` com a bolinha colorida (`transaction.category?.color`), ou "—" se vazio.

### 5. Atualizar grid template

- Alterar de `grid-cols-[40px_100px_1fr_110px_110px_110px_90px_110px_110px_90px]` (10 colunas) para `grid-cols-[40px_1fr_1fr_110px_110px_110px_90px_110px_110px_90px]` (10 colunas, mesma quantidade, substituindo Emissão por Evento Contábil).
- Atualizar o grid no `TableSkeleton` da mesma forma.

### 6. Filtro da coluna "Evento Contábil"

- Reutilizar a mesma estrutura do filtro de Cliente (Popover com search input, checkboxes multi-select, badge de contagem, botão limpar).
- O filtro já existe como `CategoryMultiFilter` na toolbar — a lógica será replicada inline no cabeçalho da coluna, usando `categoryIds` no `columnFilters`.
- Alternativamente, criar um componente `EventoContabilColumnFilter` seguindo exatamente o padrão visual do `ContactEventMultiFilter` (agora apenas "Cliente"), mas listando categorias em vez de contatos.

---

## Componentes afetados

- **`src/pages/Transactions.tsx`** — único arquivo modificado

## O que NÃO muda

- Nenhuma lógica de dados, queries, mutations, KPIs ou hooks
- Nenhum outro filtro (banco, tipo, status, datas, valores)
- Nenhuma outra página ou componente
- Dark theme e padrão visual mantidos
