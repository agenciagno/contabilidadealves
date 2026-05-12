## Diagnóstico

Confirmei dois pontos que explicam por que a tela continua vazia mesmo após você abrir guia anônima e recarregar:

### 1. O ambiente Live ainda não tem o novo código

Você está testando em **`app.contabilidadealves.com.br`** (domínio publicado). O Lovable Cloud usa **dois bancos separados** — Test (preview) e Live (publicado) — e o auto-registro de sessão (`AppLayout.useEffect`) só foi gravado no preview. Enquanto a versão publicada não for republicada, **nenhum login no domínio real grava em `active_sessions`**, e o painel continua "Nenhuma sessão ativa".

Consultei o banco Test diretamente: a tabela `active_sessions` está vazia ali também. Ou seja, mesmo no preview o upsert não está chegando — o que aponta para o item 2.

### 2. Erros do upsert estão sendo engolidos

No `AppLayout.tsx`, o `await supabase.from('active_sessions').upsert(...)` não trata `error`. Se houver qualquer falha (RLS, payload, schema), nada aparece no console e a linha simplesmente não é criada. Sem log, é impossível saber se o problema é:

- RLS bloqueando o INSERT do próprio usuário (pouco provável — a policy "Users manage own sessions" cobre `auth.uid() = user_id`),
- payload errado no upsert,
- corrida com o `useAuth` (user ainda não tem `id` no momento do effect),
- ou algo no `profile.company_id` retornando `null`.

---

## Plano de correção

### Passo 1 — Instrumentar o auto-registro (preview)

**Arquivo:** `src/components/layout/AppLayout.tsx`

- Capturar `{ data, error }` do `upsert` e do `update` (heartbeat) e logar com `console.error('[active_sessions:upsert]', error)` quando falhar.
- Logar também `console.info('[active_sessions:registered]', sessionUuid)` em sucesso.
- Logar quando `profile.company_id` vier nulo (`console.warn('[active_sessions] profile sem company_id')`).
- Disparar `ensureSession()` somente quando `user?.id` estiver definido (já está), mas adicionar guarda contra reentrada caso o effect rode duas vezes (StrictMode em dev).

Com esses logs eu consigo identificar a causa exata olhando o console no preview e te dizer o ajuste real (provavelmente RLS ou um campo NOT NULL não preenchido).

### Passo 2 — Publicar a versão corrigida

Depois do Passo 1 confirmar que o upsert grava no preview, **publicar o app**. Só assim o domínio `app.contabilidadealves.com.br` passa a registrar as sessões ativas no banco Live.

### Passo 3 — Validação

1. **No preview** (`*.lovableproject.com`): recarregar `/configuracoes` → console mostra `[active_sessions:registered]` e a sessão aparece na lista.
2. **Após publicar**: abrir `app.contabilidadealves.com.br` em guia anônima, logar com outro usuário, voltar à sessão original e recarregar `/configuracoes` → as duas sessões devem listar.
3. Forçar desconexão da guia anônima → ela deve cair em `/auth?reason=session_revoked`.

---

## Fora de escopo

- Não mexer em RLS, schema, fluxo de login ou estilos.
- Não alterar `ActiveSessionsPanel.tsx` nem `UsersTab.tsx` (estão corretos).

## Arquivos envolvidos

- **Editar:** `src/components/layout/AppLayout.tsx` — adicionar logging e tratamento de erro no upsert/heartbeat.

## Observação importante

A causa mais provável de a tela continuar vazia **agora** é simplesmente que **o app não foi publicado** após a última correção. Antes de qualquer outro debug, vale republicar e testar de novo no domínio `app.contabilidadealves.com.br`. Se mesmo após publicar continuar vazio, os logs do Passo 1 vão apontar a raiz exata.
