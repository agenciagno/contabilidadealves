

## Plano: Remover accordion — sub-eventos sempre visíveis na DRE

### Mudança

Apenas **1 arquivo** editado: `src/pages/DRE.tsx`

### O que muda

- Remover o estado `expanded` e a função `toggle`
- No componente `SectionRow`, remover os ícones ChevronRight/ChevronDown e o `onClick`
- Mudar a condição `{expanded && row.children.map(...)}` para `{row.children.map(...)}` (sempre renderizar)
- Remover imports não utilizados (`ChevronRight`, `ChevronDown`)

### Resultado

Todos os sub-eventos ficam permanentemente visíveis abaixo de seus respectivos Eventos Macro, sem necessidade de clique para expandir.

