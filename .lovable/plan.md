

## Plano: Ocultar apenas subeventos zerados (não Eventos Macros)

### Problema
A lógica atual em `DRE.tsx` (linha 221) oculta o **Evento Macro inteiro** quando previsto e realizado são zero. O correto é: Macros sempre visíveis, apenas **subeventos** (children) zerados devem ser ocultados.

### Mudanças (2 arquivos)

#### 1. `src/pages/DRE.tsx` — Remover ocultação de seções
- **Linha 221**: Remover o `if (row.previsto === 0 && row.realizado === 0) return null;`
- Macros passam a ser sempre renderizados

#### 2. `src/pages/DRE.tsx` — Filtrar children zerados no `SectionRow`
- **Linha 82**: No `.map(child => ...)`, adicionar filtro para ocultar subeventos onde `child.previsto === 0 && child.realizado === 0`

### Resumo
- 1 arquivo editado (`DRE.tsx`), 2 pontos de mudança
- 0 lógica de negócio alterada
- Apenas comportamento de ocultação visual corrigido

