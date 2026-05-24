## Objetivo
Criar uma página pública de newsletter acessível sem autenticação na rota `/newsletter/:slug`.

## Arquivos a criar

### 1. `src/pages/Newsletter.tsx`
Página standalone (sem AppLayout) que busca dados da tabela `newsletters` no Supabase via slug.

**Estrutura:**
- **Header:** logo `/Contabilidade_Alves_Branco.svg`, título "Newsletter Contabilidade Alves", subtítulo com data formatada em português, badge colorido (Diária = azul, Semanal = verde).
- **Corpo:** renderização do campo `content` com formatação:
  - `*texto*` → `<strong>`
  - `_texto_` → `<em>`
  - Linha com `━━━━━━` ou similar → `<hr className="border-t border-gray-200 my-6">`
  - Bullets (`•` ou `-` no início) → indentação suave
  - Parágrafos respeitando `\n`
  - Emojis naturais
  - Fonte legível, ~16-17px, line-height 1.6, max-width 680px centralizado
- **Footer:** "Contabilidade Alves • Juatuba, MG", link WhatsApp, texto pequeno de disclaimer.
- **Loading:** skeleton loader com `animate-pulse` blocos cinza.
- **Erro (slug não encontrado):** mensagem amigável + botão para o site.

**Query Supabase:**
```ts
const { data, error } = await supabase
  .from('newsletters')
  .select('slug, type, title, content, items_count, created_at, sent_at')
  .eq('slug', slug)
  .single();
```
Como a tabela `newsletters` não está no `types.ts`, usar casting `(supabase as any).from(...)`.

### 2. `src/App.tsx`
Adicionar a rota pública fora do `AppLayout`:
```tsx
<Route path="/newsletter/:slug" element={<Newsletter />} />
```
Importar a nova página no topo do arquivo.

## Estilo visual
- Fundo: `#FAFAF8` (off-white)
- Tipografia: Inter/System sans-serif
- Separadores: linha fina cinza claro
- Mobile-first, padding 16px em telas pequenas
- Sem sidebar, nav ou login

## Notas
- A tabela `newsletters` já tem RLS para SELECT público (policy `newsletters_public_read`).
- Não incluir botão de editar/aprovar, comentários, likes, lista de outras edições ou formulários.