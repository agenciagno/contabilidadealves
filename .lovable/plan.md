

## Plano: Atualização de Terminologia "Contato" → "Cliente/Fornecedor"

### Objetivo
Padronizar toda a terminologia do sistema, substituindo "Gestão de Contatos", "Contato", "Contatos" por "Cliente/Fornecedor" ou "Clientes/Fornecedores" em todos os locais visíveis para o usuário.

---

### Mapeamento de Substituições

| Termo Atual | Novo Termo |
|-------------|------------|
| Gestão de Contatos | Cliente/Fornecedor |
| Novo Contato | Novo Cliente/Fornecedor |
| Editar Contato | Editar Cliente/Fornecedor |
| Excluir contato? | Excluir cliente/fornecedor? |
| Total de Contatos | Total Cadastrado |
| Contatos Ativos | Ativos |
| Contatos Inativos | Inativos |
| Contato criado com sucesso! | Cliente/Fornecedor criado! |
| Contato atualizado com sucesso! | Cliente/Fornecedor atualizado! |
| Contato excluído com sucesso! | Cliente/Fornecedor excluído! |
| Contato não encontrado | Cliente/Fornecedor não encontrado |
| Nenhum contato encontrado | Nenhum cliente/fornecedor encontrado |
| Nenhum contato cadastrado | Nenhum cliente/fornecedor cadastrado |
| Contatos (header tabela) | Cliente/Fornecedor |
| Novo contato (opção select) | Novo cliente/fornecedor |
| Todos os Contatos | Todos os Clientes |

---

### Arquivos a Modificar

#### 1. `src/components/layout/AppSidebar.tsx` (linha 91)

```tsx
// ANTES:
{ title: 'Gestão de Contatos', url: '/contatos', icon: UserCircle, iconName: 'user-circle' },

// DEPOIS:
{ title: 'Cliente/Fornecedor', url: '/contatos', icon: UserCircle, iconName: 'user-circle' },
```

---

#### 2. `src/pages/Contacts.tsx` (múltiplas linhas)

| Linha | Antes | Depois |
|-------|-------|--------|
| 242 | `Novo Contato` | `Novo Cliente/Fornecedor` |
| 255 | `Total de Contatos` | `Total Cadastrado` |
| 324 | `Contatos Ativos ({activeContacts.length})` | `Ativos ({activeContacts.length})` |
| 334 | `Contatos Inativos ({inactiveContacts.length})` | `Inativos ({inactiveContacts.length})` |
| 343 | `Nenhum contato encontrado...` / `Nenhum contato cadastrado...` | `Nenhum cliente/fornecedor encontrado...` / `Nenhum cliente/fornecedor cadastrado...` |
| 352 | `Excluir contato?` | `Excluir cliente/fornecedor?` |
| 355 | `O contato será removido permanentemente` | `O cliente/fornecedor será removido permanentemente` |

---

#### 3. `src/components/contacts/ContactFormDialog.tsx` (linha 141)

```tsx
// ANTES:
<DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>

// DEPOIS:
<DialogTitle>{contact ? 'Editar Cliente/Fornecedor' : 'Novo Cliente/Fornecedor'}</DialogTitle>
```

---

#### 4. `src/hooks/useContacts.ts` (linhas 86, 89, 157, 160, 176, 179)

| Linha | Antes | Depois |
|-------|-------|--------|
| 86 | `Contato criado com sucesso!` | `Cliente/Fornecedor criado!` |
| 89 | `Erro ao criar contato` | `Erro ao criar cliente/fornecedor` |
| 157 | `Contato atualizado com sucesso!` | `Cliente/Fornecedor atualizado!` |
| 160 | `Erro ao atualizar contato` | `Erro ao atualizar cliente/fornecedor` |
| 176 | `Contato excluído com sucesso!` | `Cliente/Fornecedor excluído!` |
| 179 | `Erro ao excluir contato` | `Erro ao excluir cliente/fornecedor` |

---

#### 5. `src/components/recurring/RecurringFormDialog.tsx` (linha 438)

```tsx
// ANTES:
Novo contato

// DEPOIS:
Novo cliente/fornecedor
```

---

#### 6. `src/components/notifications/InadimplentToast.tsx` (linha 36)

```tsx
// ANTES:
description: `Total em atraso: ${formatCurrency(totalAmount)}. Acesse CRM > Contatos para detalhes.`,

// DEPOIS:
description: `Total em atraso: ${formatCurrency(totalAmount)}. Acesse CRM > Cliente/Fornecedor para detalhes.`,
```

---

#### 7. `src/pages/ContactProfile.tsx` (linha 77)

```tsx
// ANTES:
<p className="text-muted-foreground">Contato não encontrado</p>

// DEPOIS:
<p className="text-muted-foreground">Cliente/Fornecedor não encontrado</p>
```

---

#### 8. `src/components/contacts/ContactFinancialTab.tsx` (linha 216)

```tsx
// ANTES:
Nenhuma transação encontrada para este contato

// DEPOIS:
Nenhuma transação encontrada para este cliente/fornecedor
```

---

#### 9. `src/pages/CrmDispatches.tsx` (linhas 83, 258, 405)

| Linha | Antes | Depois |
|-------|-------|--------|
| 83 | `Todos os Contatos` | `Todos os Clientes` |
| 258 | `Contatos impactados` | `Clientes impactados` |
| 405 | `Contatos` (header tabela) | `Clientes` |

---

#### 10. `src/pages/Reports.tsx` (linha 353)

```tsx
// ANTES:
<TableHead>Contato</TableHead>

// DEPOIS:
<TableHead>Cliente/Fornecedor</TableHead>
```

---

#### 11. `src/hooks/useReportData.ts` (linha 212)

```tsx
// ANTES:
const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Banco', 'Contato', 'Valor', 'Status'];

// DEPOIS:
const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Banco', 'Cliente/Fornecedor', 'Valor', 'Status'];
```

---

### Resumo das Alterações

| Arquivo | Quantidade de Alterações |
|---------|--------------------------|
| `src/components/layout/AppSidebar.tsx` | 1 |
| `src/pages/Contacts.tsx` | 7 |
| `src/components/contacts/ContactFormDialog.tsx` | 1 |
| `src/hooks/useContacts.ts` | 6 |
| `src/components/recurring/RecurringFormDialog.tsx` | 1 |
| `src/components/notifications/InadimplentToast.tsx` | 1 |
| `src/pages/ContactProfile.tsx` | 1 |
| `src/components/contacts/ContactFinancialTab.tsx` | 1 |
| `src/pages/CrmDispatches.tsx` | 3 |
| `src/pages/Reports.tsx` | 1 |
| `src/hooks/useReportData.ts` | 1 |

**Total**: 11 arquivos, 24 alterações de texto

