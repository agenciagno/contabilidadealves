
## Simplificação Total dos Eventos Contábeis

### Objetivo
Tornar os Eventos Contábeis completamente neutros (sem tipo receita/despesa), simplificar o modal de cadastro para apenas o campo "Nome", e fazer todos os formulários do sistema exibirem a lista unificada.

---

### Arquivos a Modificar (4 arquivos)

---

#### 1. `src/components/categories/CategoryFormDialog.tsx`

**O que muda:** Remover os campos "Tipo" e "Cor". O formulário terá apenas o campo "Nome". Os valores `type` e `color` serão enviados com padrões fixos internamente, de forma transparente.

**Antes:**
- Campo Nome
- Campo Tipo (Select: Receita / Despesa)
- Seletor de 10 cores

**Depois:**
- Apenas campo Nome

```tsx
// handleSubmit sempre envia valores padrão — sem expor ao usuário
onSubmit({ name, type: 'receita', color: '#3B82F6', icon: 'tag' });
```

Imports removidos: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, constante `COLORS`, estados `type` e `color`.

---

#### 2. `src/pages/Categories.tsx`

**O que muda:** Substituir os dois cards separados (Receitas / Despesas) por uma única lista unificada ordenada alfabeticamente, com ícone neutro `Tag` e cor primária fixa.

**Antes:**
- `const receitas = categories.filter(c => c.type === 'receita')`
- `const despesas = categories.filter(c => c.type === 'despesa')`
- Grid de 2 colunas com cards separados

**Depois:**
- `const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name))`
- Um único card com lista completa
- Ícone `Tag` com `text-primary` e `bg-primary/10` (sem cor dinâmica)

```tsx
const CategoryCard = ({ category }) => (
  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border ...">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Tag className="w-4 h-4 text-primary" />
      </div>
      <span className="font-medium text-foreground">{category.name}</span>
    </div>
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>...</Button>
      <Button variant="ghost" size="icon" onClick={() => setDeleteId(category.id)}>...</Button>
    </div>
  </div>
);
```

Imports removidos: `TrendingUp`, `TrendingDown`.

---

#### 3. `src/components/transactions/TransactionFormDialog.tsx`

**O que muda:** Remover o filtro por tipo na linha 79 para que todos os eventos apareçam independente se a transação é receita ou despesa.

```tsx
// ANTES (linha 79):
const filteredCategories = categories.filter(c => c.type === type);

// DEPOIS:
const filteredCategories = categories;
```

Também remover o ponto colorido ao lado do nome da categoria no Select (já que os eventos não terão mais cor individual):

```tsx
// ANTES (linhas 277-285): exibe bolinha colorida
<div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />

// DEPOIS: apenas o nome
{cat.name}
```

O `handleCreateCategory` (linha 146) também passa `type` — isso será ajustado para não depender do tipo atual:
```tsx
// ANTES:
createCategory.mutate({ ...data, type }, { ... });

// DEPOIS (type virá do próprio data, que já terá 'receita' como padrão):
createCategory.mutate(data, { ... });
```

---

#### 4. `src/components/recurring/RecurringFormDialog.tsx`

**O que muda:** Remover o filtro por tipo na linha 171:

```tsx
// ANTES (linha 171):
const filteredCategories = categories.filter(c => c.type === formData.type);

// DEPOIS:
const filteredCategories = categories;
```

Também remover a bolinha colorida no Select de categorias (linhas 280-283):
```tsx
// Antes: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
// Depois: apenas {category.name}
```

---

### Nota sobre o Banco de Dados

O campo `type` na tabela `categories` **não será alterado**. Eventos existentes com `type = 'despesa'` continuarão funcionando normalmente — o sistema simplesmente passará a exibir todos independentemente do tipo. Novos eventos serão criados com `type = 'receita'` como padrão invisível.

---

### Resumo

| Arquivo | Alteração Principal |
|---|---|
| `CategoryFormDialog.tsx` | Formulário com apenas campo "Nome" |
| `Categories.tsx` | Lista única unificada, sem separação |
| `TransactionFormDialog.tsx` | Exibir todos os eventos (sem filtro por tipo) |
| `RecurringFormDialog.tsx` | Exibir todos os eventos (sem filtro por tipo) |

**Total: 4 arquivos**
