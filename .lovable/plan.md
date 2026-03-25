

## Plano: Estruturação da Área DRE + Hierarquia de Eventos Contábeis

### Mudanças

| # | Recurso | Mudança |
|---|---|---|
| 1 | **Migration SQL** | Adicionar coluna `parent_id UUID NULL` na tabela `categories` com FK self-referencing |
| 2 | `src/pages/DRE.tsx` | Nova página placeholder com cabeçalho "DRE - Demonstração do Resultado do Exercício" |
| 3 | `src/App.tsx` | Adicionar rota `/dre` com import da página |
| 4 | `src/components/layout/AppSidebar.tsx` | Adicionar item "DRE" no módulo Financeiro (ícone `FileBarChart`, após Eventos Contábeis) |
| 5 | `src/hooks/useCategories.ts` | Adicionar `parent_id: string \| null` à interface `Category`; incluir no `CategoryInsert`/`CategoryUpdate` |
| 6 | `src/components/categories/CategoryFormDialog.tsx` | Adicionar dropdown "Pertence a qual Evento Macro?" listando apenas categorias com `parent_id IS NULL` do mesmo tipo; salvar `parent_id` |
| 7 | `src/pages/Categories.tsx` | Exibir hierarquia visual: agrupar sub eventos sob seus macros com indentação e label do macro pai |

### Detalhes técnicos

**Migration:**
```sql
ALTER TABLE public.categories
ADD COLUMN parent_id uuid NULL
REFERENCES public.categories(id) ON DELETE SET NULL;
```

**CategoryFormDialog — Dropdown de Macro:**
- Receber `categories` (todas) como nova prop
- Filtrar macros: `categories.filter(c => !c.parent_id && c.type === type)`
- Excluir a própria categoria sendo editada (evitar self-reference)
- Se nada selecionado → `parent_id: null` (é um Macro)

**Categories.tsx — Visualização hierárquica:**
- Separar macros (`parent_id === null`) e subs (`parent_id !== null`)
- Renderizar macros primeiro; abaixo de cada macro, renderizar seus subs com indentação (`pl-12`) e prefixo visual `↳` + nome do macro em cinza
- Subs órfãos (sem macro válido) aparecem no final da lista

**DRE.tsx — Página placeholder:**
```tsx
export default function DRE() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">DRE - Demonstração do Resultado do Exercício</h1>
      <Card><CardContent className="p-12 text-center text-muted-foreground">
        Em construção...
      </CardContent></Card>
    </div>
  );
}
```

**Sidebar — Novo item:**
```typescript
{ title: 'DRE', url: '/dre', icon: FileBarChart, iconName: 'file-bar-chart' }
```
Posicionado após "Eventos Contábeis" no array de items do módulo Financeiro.

