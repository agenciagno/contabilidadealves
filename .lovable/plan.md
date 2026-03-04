

## Plano: 3 Correções — Filtro de Contato, Datas e Modal em Edição

### BLOCO 1: Filtro de Cliente/Evento — usar `contact_id` em vez de nome

**Causa raiz:** O filtro atual compara `t.contact?.name ?? t.description` por string, o que mistura nomes de contatos com descrições de transações sem contato, causando vazamento.

**Solução:**
- Alterar `columnFilters.contact` para armazenar `contact_id` (UUID) em vez de nome.
- Alterar a filtragem (linha 226) de `(t.contact?.name ?? t.description) === cf.contact` para `t.contact_id === cf.contact`.
- Construir `uniqueContacts` como array de `{id, name}` a partir de `allTransactions` (antes dos filtros de coluna), para evitar dependência circular.
- Criar um `ContactColumnFilter` dedicado que exibe nomes mas armazena IDs.

**Arquivo:** `src/pages/Transactions.tsx`

### BLOCO 2: Limitar dígitos nos filtros de data

**Solução:** Adicionar `max="9999-12-31"` nos inputs `type="date"` do `DateColumnFilter`.

**Arquivo:** `src/pages/Transactions.tsx` (linhas 99, 103)

### BLOCO 3: Campos bloqueados no modal em modo edição

**Solução:** No `TransactionFormDialog.tsx`:
- Derivar `const isEditing = !!transaction`.
- Adicionar `disabled={isEditing}` nos `<Select>` de Cliente/Fornecedor e Evento Contábil.
- Adicionar `disabled={isEditing}` no toggle Receita/Despesa (Tabs).
- Aplicar estilo visual `opacity-60 cursor-not-allowed` nos campos bloqueados.

**Arquivo:** `src/components/transactions/TransactionFormDialog.tsx`

---

### Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `src/pages/Transactions.tsx` | Filtro contact por ID, max em dates, ContactColumnFilter |
| `src/components/transactions/TransactionFormDialog.tsx` | disabled em campos quando editando |

