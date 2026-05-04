## Diagnóstico técnico

Os problemas persistem por uma combinação de causas estruturais de layout, não por dados/filtros/ordenação:

1. **Flexbox sem `min-w-0` nos ancestrais principais**
   - `AppLayout` usa sidebar + conteúdo em flex.
   - Em flexbox, filhos têm `min-width: auto` por padrão, então o conteúdo tenta manter sua largura mínima real.
   - Como alguns ancestrais também têm `overflow-x-hidden`, o conteúdo excedente é cortado em vez de permitir que o scroll interno da tabela assuma.

2. **Tabela com largura mínima insuficiente**
   - A tabela está dentro de `min-w-[720px]`, mas a própria grade tem colunas fixas + gaps + padding que passam de ~840px antes mesmo das colunas flexíveis de Cliente/Evento.
   - Resultado: em tablet/celular as colunas competem por espaço, textos e botões ficam comprimidos/cortados, e o scroll horizontal não fica claramente disponível.

3. **Breakpoints baseados na viewport, não na largura útil do conteúdo**
   - Em tablet, a sidebar consome parte da tela, mas classes como `sm:grid-cols-3` e `lg:grid-cols-4` continuam respondendo ao viewport inteiro.
   - Isso cria cards estreitos demais dentro da área real disponível.

4. **Toolbar e paginação não quebram linha de forma segura**
   - A barra de busca/filtros/ações e a paginação têm trechos com `ml-auto`, botões em linha única e textos sem contenção.
   - Em larguras médias e pequenas, isso força overflow lateral e acaba sendo cortado pelo `overflow-x-hidden` do layout.

5. **Scroll interno existe tecnicamente, mas não é robusto/visível**
   - O container tem `overflow-auto`, porém falta uma largura interna coerente, `min-w-0` nos pais e uma barra/indicador visual confiável.

## O que será alterado visualmente

Apenas aparência/estrutura responsiva. Não vou alterar lógica, dados, filtros, ordenação, paginação, colunas, conteúdo textual, hooks, queries ou comportamento funcional.

### 1. Layout base para permitir scroll interno

Arquivo: `src/components/layout/AppLayout.tsx`

- Adicionar contenção de largura correta aos containers principais:
  - `min-w-0`
  - `max-w-full`
- Manter a prevenção de scroll horizontal global da página, mas impedir que ela corte componentes internos que deveriam rolar.

Objetivo: o conteúdo da rota poder encolher corretamente e a tabela poder criar seu próprio scroll horizontal.

### 2. Cards KPI responsivos sem corte

Arquivo: `src/pages/Transactions.tsx`

- Ajustar o grid dos KPIs para considerar a largura útil real:
  - celular muito estreito: 1 coluna
  - celular maior: 2 colunas
  - tablet: 2 ou 3 colunas conforme largura
  - desktop: manter expansão progressiva até 7 colunas
- Adicionar `min-w-0` nos cards/conteúdos.
- Ajustar valores monetários com fonte responsiva/compacta e quebra segura (`overflow-wrap`) para não cortar valores grandes.
- Preservar todos os cards, ordem, textos, ícones e métricas.

### 3. Cabeçalho e botões sem overflow

Arquivo: `src/pages/Transactions.tsx`

- Manter layout desktop.
- Em tablet/mobile, permitir quebra segura dos botões.
- Evitar que “Nova Movimentação” force largura lateral cortada.
- Ajustar `w-full`/`min-w-0` apenas nos breakpoints pequenos.

### 4. Toolbar responsiva

Arquivo: `src/pages/Transactions.tsx`

- Fazer a toolbar quebrar linha quando não houver espaço.
- Tornar o campo de busca responsivo (`w-full` em larguras pequenas, largura fixa só quando couber).
- Ajustar o grupo de ações em massa e contador para não ser empurrado para fora da área visível.
- Não alterar nenhum filtro, popover, botão ou ação.

### 5. Tabela com scroll horizontal interno definitivo

Arquivo: `src/pages/Transactions.tsx`

- Trocar o wrapper atual da tabela para uma estrutura mais robusta:

```text
Card
  CardContent
    Scroll container horizontal/vertical com max-w-full min-w-0
      Inner table width mínima realista
        Header grid
        Rows grid
    Pagination
```

- Definir largura mínima interna coerente para a tabela, por volta de `1080px–1120px`, compatível com:
  - checkbox
  - Cliente
  - Evento Contábil
  - Vencimento
  - Prevista
  - Pagamento
  - Status
  - Valor
  - Recebido
  - Ações
- Ajustar as colunas Cliente/Evento para `minmax(...)` em vez de depender de `1fr` comprimido.
- Adicionar `min-w-0` onde textos precisam truncar corretamente dentro da célula.
- Preservar todas as colunas, filtros de coluna, ordenação, status, ações e dados.

### 6. Barra/indicador de scroll visível

Arquivo: `src/index.css`

- Criar uma classe específica para a tabela de movimentações, sem afetar outras tabelas globalmente.
- Estilizar o scrollbar horizontal/vertical para ficar visível em WebKit e Firefox.
- Melhorar o fade lateral para aparecer apenas quando houver overflow.
- Garantir que o indicador não cubra botões nem impeça clique.

### 7. Paginação sem corte

Arquivo: `src/pages/Transactions.tsx`

- Ajustar o container da paginação para quebrar em 2 linhas no mobile/tablet quando necessário.
- Permitir rolagem horizontal apenas no grupo de páginas se faltar espaço.
- Manter total, página atual, botões Anterior/Próxima e números exatamente com a mesma lógica.

## Arquivos previstos

- `src/components/layout/AppLayout.tsx`
- `src/pages/Transactions.tsx`
- `src/index.css`

## Garantias

- Não alterar lógica de negócio.
- Não alterar filtros, ordenação ou queries.
- Não alterar dados, métricas, fórmulas ou cálculos.
- Não remover cards, colunas, botões ou textos existentes.
- Não mexer em banco, autenticação, rotas ou integrações.
- A correção será estritamente visual/estrutural de responsividade.