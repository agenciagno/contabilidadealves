

## Plano de Implementação (4 Blocos)

### BLOCO 1: Limpeza de Navegação — Remover "Contas Recorrentes"

**Arquivo:** `src/components/layout/AppSidebar.tsx`
- Remover o item `{ title: 'Contas Recorrentes', url: '/recorrentes', ... }` do array `menuModules[0].items` (módulo Financeiro, linha ~82).

**Arquivo:** `src/App.tsx`
- Remover a rota `/recorrentes` e o import de `RecurringBills`.

---

### BLOCO 2: Regra de Negócio — "Data Prevista" condicional por tipo

**Arquivo:** `src/components/transactions/TransactionFormDialog.tsx`
- No `useEffect` que calcula `expectedDate` (linhas 90-98), adicionar dependência de `type`:
  - Se `type === 'receita'`: manter `addBusinessDays(dueDate, 2)`.
  - Se `type === 'despesa'`: `expectedDate = dueDate` (sem soma).

---

### BLOCO 3: Refatoração da Página Clientes com Tabs

**Arquivo:** `src/pages/Contacts.tsx`
- Envolver o conteúdo existente em um componente `Tabs` com duas abas:
  - **Aba "Clientes"**: conteúdo atual (lista/tabela completa).
  - **Aba "Entrada de Clientes 2026"**: novo componente.

---

### BLOCO 4: Aba "Entrada de Clientes 2026"

**Migration SQL:** Adicionar coluna `origin` à tabela `contacts`:
```sql
ALTER TABLE contacts ADD COLUMN origin text NOT NULL DEFAULT 'manual';
```

**Código de importação** (`ImportSpreadsheetDialog.tsx`): Ao criar contatos via importação (`onCreateContact`), garantir que passam `origin: 'imported'`. Isso requer ajuste no callback do componente pai que chama `createContact` durante importação — provavelmente em `Transactions.tsx` ou `PagarReceber.tsx`.

**Hook `useContacts`:** O `createContact` já insere com os dados recebidos. Basta que o chamador passe `origin: 'manual'` (default do banco) ou `origin: 'imported'`.

**Novo componente (dentro de `Contacts.tsx` ou arquivo separado):**
- Tabela com colunas: Data de Cadastro (DD/MM/YYYY), Nome, CNPJ, Valor do Honorário (`boleto_value`).
- Filtro: `origin = 'manual'` AND `created_at >= '2026-01-01'`.
- Rodapé com KPIs:
  - Total de Novos Clientes (count).
  - Receita de Novos Honorários (soma de `boleto_value`).

---

### Detalhes Técnicos

- A coluna `origin` com default `'manual'` faz com que todos os contatos existentes e futuros cadastrados manualmente já tenham o valor correto.
- O código de importação precisa ser atualizado para passar `origin: 'imported'` ao criar contatos via planilha.
- A interface `Contact` e `ContactInsert` em `useContacts.ts` precisam incluir o campo `origin`.

