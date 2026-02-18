
# Editar Dados e Módulos de Acesso de Usuários Existentes

## Diagnóstico Atual

Nas duas abas de gerenciamento de usuários, a coluna "Ações" só tem o botão de excluir (lixeira). Não existe nenhum fluxo de edição — ao precisar alterar nome ou módulos de um usuário, o admin precisaria excluí-lo e recriá-lo.

Dois pontos precisam receber a funcionalidade:

- **Aba "Minha Equipe"** → `UsersTab.tsx` (usa `UserFormDialog.tsx`)
- **Aba "Empresas Clientes"** → `ClientCompaniesTab.tsx` (modal inline)

---

## O que será editável

| Campo | Minha Equipe | Empresas Clientes |
|---|---|---|
| Nome Completo | Sim | Sim |
| Nome de Usuário | Sim | Não (usa email real) |
| Módulos de Acesso | Sim | Sim |
| Nova Senha (opcional) | Sim | Sim |

A edição de senha é **opcional**: se o campo for deixado em branco, a senha atual é mantida. Se preenchida, precisa passar pela validação de senha forte.

A edição de e-mail **não** será incluída por segurança (e-mail é o identificador de autenticação — mudá-lo exigiria re-autenticação no Supabase Auth).

---

## Mudanças por Arquivo

### 1. `supabase/functions/create-user-v2/index.ts` — Ampliar para suportar modo "editar"

A edge function atual só cria usuários. Ela precisa de um novo modo de atualização. A lógica será:

- Se o body contiver `userId` (UUID do auth user), a função entra em modo de **edição**:
  - Atualiza `profiles` com `full_name`, `username` (se presente), `allowed_modules`
  - Se `password` for fornecida, usa a Admin API (`supabase.auth.admin.updateUserById`) para atualizar a senha sem invalidar a sessão do admin
- Se não houver `userId`, mantém o comportamento atual de criação

Isso evita criar uma segunda edge function e centraliza a lógica de provisionamento.

### 2. `src/components/users/UserFormDialog.tsx` — Adaptar para modo criação E edição

O componente atualmente só cria usuários. Será refatorado para suportar um modo de edição:

**Novas props opcionais:**
```typescript
interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
  // Novas:
  editUser?: {
    userId: string;      // auth user_id para chamar a edge function
    fullName: string;
    username: string;
    allowedModules: string[];
  };
}
```

**Comportamento em modo edição (`editUser` presente):**
- Título muda para "Editar Usuário"
- Campos pré-preenchidos com dados do usuário
- Campo `username` editável
- Campos de senha tornam-se **opcionais** com label "Nova Senha (deixe em branco para manter)"
- Botão de submit chama a edge function com `userId` no payload
- Validação Zod separada para o schema de edição (senha não obrigatória)

### 3. `src/components/users/UsersTab.tsx` — Adicionar botão de edição na tabela

- Importar o ícone `Pencil` do lucide
- Adicionar estado `editUser: Profile | null`
- Na coluna "Ações", ao lado do botão de lixeira, adicionar botão de lápis (ghost, icon)
- Usuário master (`is_super_admin`) pode ter o botão de edição, mas não de exclusão de si mesmo (já implementado)
- Passar `editUser` ao `UserFormDialog` via a nova prop `editUser`
- Ao fechar o dialog de edição, limpar `editUser` no estado

### 4. `src/components/settings/ClientCompaniesTab.tsx` — Modal de edição inline

Adicionar um novo dialog de edição embutido no mesmo arquivo (sem criar novo arquivo separado, mantendo o padrão atual do componente):

**Novo estado:**
```typescript
const [editUserOpen, setEditUserOpen] = useState(false);
const [editingUser, setEditingUser] = useState<Profile | null>(null);
const [editUserForm, setEditUserForm] = useState({
  fullName: '',
  password: '',
  allowedModules: [] as string[],
});
```

**Handler `handleEditUser`:**
- Chama a edge function `create-user-v2` com o `userId` do usuário
- Se senha em branco, não envia o campo `password` no payload
- Invalida a query `['company-users', selectedCompanyId]` ao sucesso

**Na tabela de usuários:** adicionar botão de lápis ao lado da lixeira, que abre o modal de edição pré-preenchido.

**Modal de edição:** Dialog com campos "Nome Completo", "Nova Senha (opcional)" + `PasswordStrength` e checkboxes de "Módulos de Acesso".

---

## Fluxo de Dados

```text
[Botão Editar na tabela]
        ↓
[Abre dialog pré-preenchido com dados do usuário]
        ↓
[Admin altera nome / módulos / senha (opcional)]
        ↓
[Clica "Salvar"]
        ↓
[Edge function create-user-v2 com { userId, fullName, allowedModules, password? }]
        ↓
[Edge function detecta userId → modo UPDATE]
        ↓
[UPDATE profiles SET full_name, allowed_modules WHERE user_id = userId]
[Se password → auth.admin.updateUserById(userId, { password })]
        ↓
[Invalidate query → tabela atualiza automaticamente]
```

---

## Resumo de Arquivos

| Arquivo | Tipo | Mudança |
|---|---|---|
| `supabase/functions/create-user-v2/index.ts` | Modificar | Adicionar modo UPDATE quando `userId` está presente no body |
| `src/components/users/UserFormDialog.tsx` | Modificar | Suportar modo edição via prop `editUser`, senha opcional, pré-preencher campos |
| `src/components/users/UsersTab.tsx` | Modificar | Botão de lápis na tabela, estado `editUser`, passar para `UserFormDialog` |
| `src/components/settings/ClientCompaniesTab.tsx` | Modificar | Estado + modal + handler de edição + botão de lápis na tabela de usuários |

Nenhuma migration de banco de dados é necessária — as colunas `full_name` e `allowed_modules` já existem na tabela `profiles`.
