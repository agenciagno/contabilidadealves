## Objetivo

Adicionar um **aviso visual em destaque** quando o app estiver rodando no ambiente de **desenvolvimento (preview)**, deixando claro que os dados ali NÃO são os mesmos do ambiente publicado.

## Contexto

- Ambiente Test (preview): `id-preview--…lovable.app` → banco Test (`slyagzloscnhplczgosx`).
- Ambiente Live (publicado): `contabilidadealves.lovable.app` → banco Live (`wpczgwxsriezaubncuom`).
- Os dois bancos são independentes; lançamentos feitos em um não aparecem no outro.

## Como detectar o ambiente

Comparar `window.location.hostname` em runtime:

- Contém `id-preview--` ou `lovable.app/projects/` → **DEV / TEST**.
- Hostname for o domínio publicado (`contabilidadealves.lovable.app`) ou domínio próprio → **LIVE**.

A função utilitária ficará em `src/lib/environment.ts` e exportará `isDevEnvironment(): boolean`.

## Mudanças visuais

### 1. Banner fixo no topo (apenas em DEV)

Novo componente `src/components/layout/DevEnvironmentBanner.tsx`:

- Renderiza somente quando `isDevEnvironment() === true`.
- Barra fina fixa no topo, full-width, acima do `AppHeader`.
- Cor: amarelo/âmbar de aviso (usar token semântico — `bg-yellow-500/15`, `text-yellow-600 dark:text-yellow-400`, `border-yellow-500/30`), seguindo o padrão minimalista Apple-like do projeto.
- Conteúdo:
  - Ícone `AlertTriangle` (lucide-react).
  - Texto: **"Ambiente de Desenvolvimento — os dados exibidos aqui não refletem o app publicado."**
- Altura ~32px, tipografia pequena (text-xs), centralizado.
- Sem botão de fechar (precisa estar sempre visível em DEV).

### 2. Integração no layout

Em `src/components/layout/AppLayout.tsx`:
- Renderizar `<DevEnvironmentBanner />` no topo absoluto do layout, antes do `AppHeader`.
- Ajustar o `padding-top` / espaçamento do conteúdo abaixo apenas o suficiente para acomodar a barra (sem alterar nenhum outro componente, card, métrica ou cálculo).

### 3. Badge sutil no `AppHeader` (opcional, mesma fonte de verdade)

No `src/components/layout/AppHeader.tsx`, ao lado do nome da empresa, adicionar um pequeno badge `DEV` quando `isDevEnvironment()` for `true`. Mesmo esquema de cor da barra. Pequeno, não intrusivo.

## Fora de escopo (não será alterado)

- Nenhum cálculo de saldo, lógica de bancos, hooks (`useBankTransactions`, `useBanks`), filtros, queries ou regras de negócio.
- Layout dos cards de banco e Saldo Total permanece intacto.
- Nenhuma mudança de rota, autenticação ou permissões.

## Sobre a diferença de R$ 96,83 entre Sicoob e Saldo Total no Live

Como você confirmou que existem apenas Sicoob e Caixa Geral, ambos visíveis e ativos no Live, **a matemática da página deveria fechar** (Caixa 0,00 + Sicoob 11.443,67 = 11.443,67, mas o card mostra 11.540,50). Isso indica que **há um lançamento ou conta não-óbvio no banco Live** que minhas ferramentas (apontadas para o Test) não conseguem inspecionar diretamente.

Proponho tratar isso em **um próximo ticket separado**, onde você poderá:
- Exportar a lista de bancos e a soma de transações pagas de 2026 do ambiente Live, ou
- Me autorizar a adicionar um pequeno painel de debug (visível só em DEV) que liste, por banco, `initial_balance + receitas pagas - despesas pagas` para validar o cálculo direto na página `/bancos`.

## Arquivos afetados nesta entrega

- **Novo:** `src/lib/environment.ts`
- **Novo:** `src/components/layout/DevEnvironmentBanner.tsx`
- **Editado:** `src/components/layout/AppLayout.tsx` (montar o banner)
- **Editado (opcional):** `src/components/layout/AppHeader.tsx` (badge DEV)
