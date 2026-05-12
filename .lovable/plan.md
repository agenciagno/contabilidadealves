# Diagnóstico final — sessões não aparecem em produção

## Causa raiz

Os logs do navegador em `app.contabilidadealves.com.br` mostram:

```
[active_sessions:upsert] falhou
{ code: 'PGRST205',
  message: "Could not find the table 'public.active_sessions' in the schema cache",
  hint: "Perhaps you meant the table 'public.transactions'" }
```

O código do front-end já está correto (auto-registro + heartbeat + listener funcionando no preview). O problema é puramente de **infraestrutura de banco**:

- A migração que cria `active_sessions` foi aplicada no banco de **Test** (preview Lovable, ref `slyagzloscnhplczgosx`) — a tabela existe lá.
- O domínio publicado `app.contabilidadealves.com.br` consulta o banco **Live** (`bapydjfdfiozbmsbrnfb`), onde a tabela **não existe**.
- Por isso o upsert retorna 404 e a listagem fica vazia em produção, mesmo com várias abas abertas.

## Plano

**Passo único — Publicar o app**

Ao publicar, a migração `active_sessions` (com índice único em `session_uuid` e RLS) é propagada para o banco Live, junto com o código já corrigido de `AppLayout.tsx` e `ActiveSessionsPanel.tsx`.

Não é necessária nenhuma alteração de código. Basta clicar em **Publicar**.

## Validação após publicar

1. Abrir `app.contabilidadealves.com.br` em duas abas (uma anônima).
2. Em ambas, abrir o DevTools → Console e procurar por `[active_sessions:registered]`.
3. Ir em **Configurações → Minha Equipe → Sessões Ativas**.
4. Devem aparecer as duas sessões, com badge **"Esta sessão"** marcando a aba atual.
5. Testar o botão de desconectar na outra sessão — ela deve receber o evento realtime e ser deslogada.

## Fora de escopo

- Nenhuma alteração de código (front, RLS, schema ou edge functions).
- Nenhuma alteração no painel de sessões além da publicação.

