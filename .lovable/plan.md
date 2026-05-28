## Plano — Aba "Acessos" (Cofre de senhas) no perfil do cliente

### Arquivos novos
1. `src/hooks/useAcessosCliente.ts` — hook com React Query
   - `useAcessosCliente(contactId)` — SELECT explícito de `id, portal, portal_label, login, validade_certificado, observacao, contact_id, company_id, updated_at, atualizado_por` (sem `senha_encrypted`)
   - `useSalvarAcesso()` — mutation que invoca Edge Function `cofre-salvar`
   - `useExcluirAcesso()` — mutation DELETE direto em `acessos_portais`
   - `useRevelarSenha()` — invoca `cofre-revelar` com `{ acesso_id, acao }`

2. `src/components/contacts/AcessosTab.tsx` — container da aba
   - Loading: skeleton de linhas
   - Vazio / erro: mensagens do briefing
   - Botão "+ Adicionar acesso" → abre `AcessoFormDialog`
   - Renderiza `AcessosTable`

3. `src/components/contacts/AcessosTable.tsx` — tabela shadcn
   - Colunas: Portal | Login | Senha | Validade | Obs | Ações
   - Portal: badge com label do enum (mapa `PORTAL_LABELS`); usa `portal_label` se preenchido
   - Senha: `••••••••` + botões 👁 Revelar e 📋 Copiar (lógica abaixo)
   - Validade: badge verde/amarelo/vermelho só quando `portal === 'certificado_digital'` e `validade_certificado` definida (cálculo de dias com `date-fns`)
   - Ações: ícones lápis (editar) e lixeira (excluir com `AlertDialog` de confirmação)

4. `src/components/contacts/AcessoFormDialog.tsx` — Dialog criar/editar
   - Campos: Portal (Select), portal_label (Input), login (Input), senha (Input password com toggle olho), validade_certificado (DatePicker shadcn — só visível se portal = certificado_digital), observacao (Textarea)
   - No modo edição: campo senha começa vazio com placeholder "Deixe em branco para manter a atual"; backend só atualiza senha se vier preenchida
   - Submit → `useSalvarAcesso` → toast "Acesso salvo com segurança"

### Edge Function (já existe)
- `cofre-salvar` já foi criada e deployada. Ajuste pequeno se necessário: aceitar `senha` opcional no UPDATE (não sobrescrever quando vazia). Será confirmado ao abrir o arquivo em build mode.
- `cofre-revelar` já existe e cobre as ações `REVELAR` e `COPIAR` (logando em `cofre_acessos_log`).

### Integração no perfil
- `src/pages/ContactProfile.tsx`:
  - Importar `AcessosTab` e `useAuth`/`useUserProfile` existente para checar `is_super_admin || role === 'admin'`
  - Adicionar 6ª aba `acessos` (entre "Cadastro Completo" e "Logs", conforme briefing diz "após Sócios" — Sócios fica dentro de Cadastro Completo; vou inseri-la logo após "super-perfil" e ajustar `grid-cols-7` → `grid-cols-8`)
  - Renderizar `<TabsTrigger value="acessos">` e `<TabsContent>` somente se usuário for admin/super admin
  - Ícone: `KeyRound` do lucide-react

### Comportamento Revelar / Copiar
- Revelar: invoca função → exibe valor por 5s (setTimeout) → volta para `••••••••`. Erro → toast destrutivo "Sem permissão ou senha não cadastrada".
- Copiar: invoca função com `acao: 'COPIAR'` → `navigator.clipboard.writeText` → toast "Senha copiada!". Nunca exibe na UI.
- Estado local por linha (`revealedId`, `revealedValue`) para isolar.

### Restrições respeitadas
- Frontend nunca seleciona `senha_encrypted` nem envia senha em texto direto ao Supabase — só via Edge Functions.
- RLS atual já permite admin gerenciar `acessos_portais`; visibilidade da aba é dupla (UI + RLS).
- Reskin visual: não altero nenhuma aba/lógica existente, apenas adiciono a nova aba pedida.

### Hook de permissão
- Reusar a forma já existente no projeto. Em build mode confirmarei se há `useUserRole`/`useAuth` exportando `isAdmin`/`isSuperAdmin`; caso contrário, leio `profiles` via query simples por `user_id = auth.uid()`.

### Pontos de confirmação rápida
- OK inserir aba como 6ª posição visual (após "Cadastro Completo" no header atual, que já tem 7 abas). Grid passa para `grid-cols-8`.
- OK manter Edge Functions já deployadas; só ajusto `cofre-salvar` se UPDATE sem senha não estiver previsto.
