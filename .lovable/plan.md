

## Plano: Corrigir UX do Filtro Multi-select e Melhorar Ícones

### BLOCO 1 + 2: Popover persistente e busca mantida

**Em `ContactEventMultiFilter` (linhas 138-257 de `src/pages/Transactions.tsx`):**

1. Adicionar estado `open` controlado manualmente no `<Popover open={open} onOpenChange={setOpen}>`.
2. No `<PopoverContent>`, adicionar `onPointerDownOutside` para fechar, mas **não** fechar ao interagir com checkboxes internos — isso já é resolvido pelo controle manual do `open`.
3. O texto do `search` já é estado local e não é limpo no `toggleContact`/`toggleEvent` — apenas garantir que continue assim (já está correto no código atual, o bug é causado pelo fechamento automático do Popover).
4. Limpar `search` apenas no `clearAll` e ao fechar o popover (`onOpenChange(false)`).

### BLOCO 3: Destaque visual dos ícones de filtro

**Em `ColumnFilterIcon` (linha 134-136):**

1. Aumentar tamanho do ícone de `w-3 h-3` para `w-3.5 h-3.5`.
2. Estado inativo: mudar de `opacity-40` para `text-muted-foreground/70` (mais visível).
3. Estado ativo: usar `text-primary` com um dot indicator (bolinha) via pseudo-element ou span.
4. Adicionar `hover:text-primary` transition para affordance.

**Nos botões `<PopoverTrigger>` do header (linhas 771-816):**

5. Adicionar padding e hover state ao botão: `p-1 rounded hover:bg-muted/60 transition-colors`.

### Arquivos impactados
- `src/pages/Transactions.tsx` (único arquivo)

