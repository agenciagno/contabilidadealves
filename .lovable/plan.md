
## Ajustes Visuais Finais - Transactions Page

### 1. Reduzir largura da coluna de checkbox (seleção)
Reduzir a coluna de checkbox de `40px` para `24px` nas 3 definições de grid-cols em `Transactions.tsx` (header, skeleton, rows).

### 2. Remover gradiente lateral do scroll da tabela
O `::after` pseudo-element com `linear-gradient` em `.table-scroll-container` fica fixo e atrapalha a leitura. Remover completamente o bloco `::after` e `.has-scroll::after` em `src/index.css`. Remover também o JS de detecção (`checkTableScroll`, `useRef`, `useCallback`, `useEffect`) em `Transactions.tsx`.

### 3. Sidebar no mobile com textos visíveis
O sidebar mobile (Sheet) está mostrando apenas ícones. O problema é que o `collapsed` state está sendo usado dentro do Sheet. Na sidebar mobile, o conteúdo renderiza dentro de um Sheet e deve sempre mostrar textos. O `AppSidebar` usa `const collapsed = state === 'collapsed'` para esconder textos. Quando `isMobile=true`, o sidebar é renderizado via Sheet, mas `collapsed` pode estar `true`. Corrigir criando uma variável `const showLabels = isMobile || !collapsed` e usar essa variável no lugar de `!collapsed` nas condições de exibição de texto.

### 4. Sidebar overlay no tablet
Atualmente o breakpoint de mobile é 768px. Tablets (768-1024px) renderizam o sidebar fixo como desktop. Alterar `MOBILE_BREAKPOINT` em `use-mobile.tsx` de `768` para `1024` para que tablets também usem o Sheet overlay. Ajustar o sidebar desktop de `md:block`/`md:flex` para `lg:block`/`lg:flex` em `sidebar.tsx`.

### 5. Modal mais largo em desktop/tablet
Alterar `sm:max-w-[580px]` no `TransactionFormDialog.tsx` para `sm:max-w-[720px]` para reduzir necessidade de scroll interno.

### 6. Layout mobile do formulário
No `TransactionFormDialog.tsx`, aplicar classes responsivas nos grids:
- Cliente/Fornecedor: ocupar linha completa no mobile (`grid-cols-1 sm:grid-cols-2` ou `sm:grid-cols-3`)
- Demais campos: sempre 2 colunas (`grid-cols-2`) em todas as telas

---

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/pages/Transactions.tsx` | Checkbox 24px, remover scroll fade JS |
| `src/index.css` | Remover `.table-scroll-container::after` e `.has-scroll::after` |
| `src/components/layout/AppSidebar.tsx` | `showLabels` = `isMobile \|\| !collapsed` |
| `src/hooks/use-mobile.tsx` | Breakpoint 768 -> 1024 |
| `src/components/ui/sidebar.tsx` | `md:` -> `lg:` para sidebar desktop |
| `src/components/transactions/TransactionFormDialog.tsx` | max-w-[720px], grid responsivo mobile |
