## Diagnóstico

A funcionalidade já existe parcialmente:

- Tabela `active_sessions` com RLS correto (Super Admin lê e deleta tudo; usuários gerenciam apenas as próprias).
- Insert da sessão acontece em `AuthContext.signIn` quando o usuário faz login.
- `AppLayout` já tem listener Realtime que desloga e redireciona quando a `active_sessions` row do `session_uuid` local é deletada → o "forçar desconexão" funciona ponta-a-ponta.
- `ActiveSessionsPanel` é renderizado em `UsersTab` apenas para Super Admin.

Por que a tela mostra "Nenhuma sessão ativa":

1. **Sessões pré-existentes nunca foram registradas.** O insert só roda em `signIn`. Quem já estava logado antes do recurso ser adicionado (incluindo o próprio Gabriel) não tem linha em `active_sessions`. Confirmei via SQL: a tabela está vazia.
2. **Painel filtra por `companyId`.** Mesmo com Super Admin, hoje o painel restringe à empresa do próprio usuário. O pedido é ver **todos os dispositivos logados em todas as empresas**.

---

## Plano de correção

### 1. Auto-registrar sessão em qualquer carregamento autenticado

**Arquivo:** `src/components/layout/AppLayout.tsx`

Adicionar um `useEffect` que, ao montar com `user` válido:

- Lê `session_uuid` do `localStorage`.
- Se não existir, gera um novo via `crypto.randomUUID()` e grava.
- Faz `upsert` em `active_sessions` por `session_uuid` com: `user_id`, `company_id` (buscado do `profiles`), `device_info = navigator.userAgent`, `logged_in_at`, `last_seen_at`.
- Em foco/intervalo (a cada ~60s), atualiza apenas `last_seen_at` por `session_uuid`.

Isso garante que:
- Sessões antigas passam a aparecer no painel automaticamente.
- O `last_seen_at` reflete atividade real, não só o login.
- A linha existente do listener Realtime continua valendo (mesma `session_uuid`).

Manter o insert do `AuthContext.signIn` como está; o upsert do layout é idempotente.

### 2. Painel: visão global para Super Admin + sessão atual destacada

**Arquivo:** `src/components/users/ActiveSessionsPanel.tsx`

- Remover o filtro `.eq('company_id', companyId)` quando o usuário é Super Admin (fetch global). Para garantir, ler `useSuperAdmin()` dentro do próprio painel em vez de receber `companyId` como prop.
- Buscar também o nome da empresa para cada `company_id` (join via segunda query em `companies`) e exibir uma nova coluna **Empresa**.
- Comparar `session.session_uuid` com `localStorage.session_uuid` e marcar a linha do usuário atual com um badge **"Esta sessão"** e um leve destaque visual.
- Botão de desconectar:
  - Mantém a ação atual (delete por `id`), que já dispara o listener Realtime e desloga o destino.
  - Se for a própria sessão, abrir um `AlertDialog` de confirmação ("Você será desconectado imediatamente.") antes de deletar.
- Adicionar coluna **"Última atividade"** usando `last_seen_at` formatado em `dd/MM/yyyy HH:mm`.

### 3. Ajuste no `UsersTab`

**Arquivo:** `src/components/users/UsersTab.tsx`

- Manter `{isSuperAdmin && <ActiveSessionsPanel />}`.
- Remover a prop `companyId` (não é mais necessária — painel agora é Super Admin global).

### 4. Validação manual

1. Recarregar `/configuracoes` → aba **Minha Equipe** com Super Admin: deve aparecer a sessão atual de Gabriel (Chrome · macOS).
2. Logar em outro navegador/dispositivo com outro usuário: aparece nova linha; Super Admin clica no botão de desconectar → o outro dispositivo é redirecionado para `/auth?reason=session_revoked` em segundos (Realtime).
3. Super Admin desconecta a própria sessão → confirmação → é deslogado imediatamente.

---

## Fora de escopo

- Não alterar fluxo de login, RLS, nem schema de `active_sessions`.
- Não criar novas tabelas, edge functions ou integrações.
- Não tocar em estilos/visual além da nova coluna e badge "Esta sessão".

## Arquivos envolvidos

- **Editar:** `src/components/layout/AppLayout.tsx` — auto-registro + heartbeat de `last_seen_at`.
- **Editar:** `src/components/users/ActiveSessionsPanel.tsx` — visão global Super Admin, coluna empresa, badge "Esta sessão", confirmação ao desconectar a própria sessão.
- **Editar:** `src/components/users/UsersTab.tsx` — remover prop `companyId`.
