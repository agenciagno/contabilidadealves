
# Correções: Super Admin, Sessão e Senha Forte

## Diagnóstico dos 3 Problemas

### Problema 1 — Aba "Empresas Clientes" não aparece
O banco confirma que `is_super_admin = true` para `gwalves13@gmail.com`. O problema é de **cache no hook**: `useSuperAdmin` tem `staleTime: 60000` (1 minuto). Se o hook carregou antes da migration ser aplicada, ele ficou cacheado com `false` e a aba não renderiza. Correção: remover o `staleTime` alto e forçar `refetchOnMount: 'always'`.

### Problema 2 — Criar usuário interno substitui a sessão atual
`UserFormDialog` usa `supabase.auth.signUp()`, que além de criar o usuário **faz login automático** com a nova conta, expulsando o usuário atual. A aba "Empresas Clientes" já usa corretamente a edge function `create-user-v2`, que usa service role sem tocar na sessão. A aba "Minha Equipe" precisa receber o mesmo tratamento.

### Problema 3 — Senha fraca permitida
O schema atual valida apenas 6+ caracteres. Os requisitos pedidos (8+ chars, maiúscula, minúscula, número) precisam ser aplicados com indicadores visuais em tempo real nos dois pontos de criação de usuário: `UserFormDialog` (Aba 2) e `ClientCompaniesTab` (Aba 3).

---

## Solução Técnica

### Arquivo 1: `src/hooks/useSuperAdmin.ts`
Remover `staleTime: 60000` e adicionar `refetchOnMount: 'always'` para garantir que o status de super admin seja sempre buscado do servidor na montagem do componente, sem depender de cache.

### Arquivo 2: `src/components/ui/PasswordStrength.tsx` (novo componente reutilizável)
Um componente dedicado que recebe a senha atual via prop e exibe os 4 requisitos em tempo real:

```
Requisitos da senha:
✓ Mínimo 8 caracteres
✗ Uma letra maiúscula (A-Z)
✓ Uma letra minúscula (a-z)
✗ Um número (0-9)
```

Cada linha mostra um ícone `CheckCircle2` (verde) quando satisfeito, ou `Circle` (cinza/vermelho) quando não. A validação é feita via regex em cada `onChange` da senha.

Uma função utilitária exportada `isPasswordStrong(password: string): boolean` será usada pelo schema Zod e pelos handlers para bloquear o submit se algum requisito não estiver satisfeito.

### Arquivo 3: `src/components/users/UserFormDialog.tsx`
Três mudanças:

**A) Substituir `supabase.auth.signUp` pela edge function `create-user-v2`:**
- Remover todo o bloco `supabase.auth.signUp` + inserção manual de profile + inserção de role
- Substituir pelo mesmo padrão de `fetch` já usado em `ClientCompaniesTab`:
  ```typescript
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: internalEmail, password, fullName, companyId, allowedModules: ['financeiro','crm','relatorios'] }),
  });
  ```
- O email interno (`username@internal.local`) continua sendo gerado a partir do username para evitar emails reais

**B) Atualizar a validação Zod:** senha mínimo 8 chars + regex para maiúscula, minúscula e número

**C) Adicionar o componente `PasswordStrength` abaixo do campo de senha**

### Arquivo 4: `src/components/settings/ClientCompaniesTab.tsx`
Apenas adicionar o componente `PasswordStrength` nos dois campos de senha existentes (criação de admin para nova empresa e criação de usuário avulso). A lógica de criação via edge function já está correta — não será alterada. Adicionar validação de senha forte antes do submit de cada modal.

---

## Resumo de Arquivos

| Arquivo | Tipo | Mudança |
|---|---|---|
| `src/hooks/useSuperAdmin.ts` | Modificar | Remover staleTime, adicionar refetchOnMount |
| `src/components/ui/PasswordStrength.tsx` | Criar | Componente reutilizável de força de senha |
| `src/components/users/UserFormDialog.tsx` | Modificar | Trocar signUp → edge function; validação forte; PasswordStrength |
| `src/components/settings/ClientCompaniesTab.tsx` | Modificar | Adicionar PasswordStrength nos campos de senha; validação forte no submit |

Nenhuma migration de banco de dados é necessária — o usuário já está marcado como super admin no banco.
