

## Plano: Refinar Sidebar — Ícones Finos + Modo Colapsado Corrigido

### Problemas Identificados

1. **Modo colapsado sem respiro**: `SIDEBAR_WIDTH_ICON = "3rem"` (48px) é muito estreito para o ícone do header (`w-10` = 40px) + `p-4` (16px cada lado). O ícone fica espremido/distorcido.
2. **Ícones com traço padrão**: Todos os ícones Lucide usam `strokeWidth` padrão (2), devem usar 1.5 para a estética premium.

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/components/ui/sidebar.tsx` | `SIDEBAR_WIDTH_ICON` de `"3rem"` para `"4rem"` (64px) — mais respiro no modo colapsado |
| 2 | `src/components/layout/AppSidebar.tsx` | Ícones com `strokeWidth={1.5}`, header redimensionado para caber no modo colapsado (`w-8 h-8`), padding ajustado, centralização dos ícones |

### Detalhes

**sidebar.tsx** — Apenas a constante na linha 19:
```typescript
const SIDEBAR_WIDTH_ICON = "4rem"; // era "3rem"
```

**AppSidebar.tsx** — Alterações visuais:
- Ícone do header: `w-10 h-10` → `w-8 h-8` (cabe no colapsado sem distorção)
- Todos os ícones de menu: adicionar `strokeWidth={1.5}` e manter `w-[18px] h-[18px]`
- Ícones de sub-itens: `w-3.5 h-3.5` → `w-4 h-4` com `strokeWidth={1.5}`
- Header padding: `p-4` → `p-3` (mais proporcionado no colapsado)
- Centralizar ícones no modo colapsado com `justify-center`
- Ícones do footer (Settings, LogOut, Avatar): mesma consistência `strokeWidth={1.5}`

### Resultado
- Modo colapsado com respiro lateral adequado
- Ícone do topo sem distorção
- Traço fino em todos os ícones (1.5)
- 2 arquivos editados, 0 lógica alterada

