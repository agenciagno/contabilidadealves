
## Melhorias nos Cards e Toggle de Visualização em Clientes/Fornecedores

### O que será mudado

Três melhorias distintas na página `src/pages/Contacts.tsx`:

---

### 1. Campos de contato com altura uniforme (Documento, Telefone, E-mail)

**Problema atual:** Os campos só renderizam se existirem (`{contact.document && ...}`), então cards com dados incompletos ficam com alturas diferentes.

**Solução:** Renderizar sempre as 3 linhas de informação, exibindo um traço (`—`) ou espaço reservado quando o campo estiver vazio. Isso garante que todos os cards ocupem a mesma altura na área de informações.

```tsx
// Cada linha sempre renderizada — com ou sem dado
<div className="flex items-center gap-2 h-5">
  <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
  {contact.document
    ? <button onClick={...}>...</button>
    : <span className="text-muted-foreground/30 text-xs">—</span>
  }
</div>
```

---

### 2. Botão "Ver Perfil" → ícone `Eye` (igual a Editar e Excluir)

**Antes:** Um botão `flex-1` com texto "Ver Perfil" e ícone `Eye`.

**Depois:** Três ícones lado a lado de tamanho igual (`size="icon"`, `variant="ghost"`):

```text
[ 👁 ]  [ ✏ ]  [ 🗑 ]
```

```tsx
<div className="flex gap-1 mt-4 pt-3 border-t border-border/50 justify-end">
  <Button variant="ghost" size="icon" title="Ver Perfil" onClick={() => navigate(...)}>
    <Eye className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" title="Editar" onClick={() => handleEdit(contact)}>
    <Edit2 className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeleteId(contact.id)}>
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
</div>
```

---

### 3. Toggle de Visualização: Cards ↔ Lista

**Estado:** `viewMode: 'card' | 'list'` (padrão `'card'`).

**Toggle no cabeçalho** — dois ícones, `LayoutGrid` (cards) e `List` (lista), usando o componente `ToggleGroup` já instalado no projeto:

```text
[ Cliente/Fornecedor ]              [ ⊞ ☰ ]  [ + Novo Cliente/Fornecedor ]
```

**Visualização em Lista** (`viewMode === 'list'`):

Uma tabela compacta com colunas: Nome | Documento | Telefone | E-mail | Status | Ações. Cada linha tem os mesmos 3 ícones de ação (Ver Perfil, Editar, Excluir) alinhados à direita.

```text
┌─────────────────┬──────────────────┬──────────────┬──────────────────────┬──────┬───────────┐
│ Nome            │ CPF/CNPJ         │ Telefone     │ E-mail               │ ●    │ Ações     │
├─────────────────┼──────────────────┼──────────────┼──────────────────────┼──────┼───────────┤
│ Empresa XYZ     │ 12.345.678/0001  │ (11) 9xxxx   │ contato@empresa.com  │ 🟢   │ 👁 ✏ 🗑  │
└─────────────────┴──────────────────┴──────────────┴──────────────────────┴──────┴───────────┘
```

A visualização em lista usa `<table>` com as classes `Table`, `TableHeader`, `TableRow`, `TableCell` do projeto.

---

### Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Contacts.tsx` | Todas as 3 melhorias (estado `viewMode`, componente `ContactCard` atualizado, novo componente `ContactRow` para lista, toggle no header) |

Nenhuma migração de banco de dados. Nenhum outro arquivo alterado.

---

### Novos imports necessários

```typescript
import { LayoutGrid, List } from 'lucide-react'; // já no lucide-react instalado
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'; // já no projeto
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // já no projeto
```
