
## Busca Automática de CEP no Formulário de Clientes

### Visão Geral

A implementação exige dois tipos de mudanças: expansão do banco de dados para armazenar os novos campos de endereço, e atualização do formulário com a lógica de busca de CEP integrada à busca de CNPJ já existente.

---

### Parte 1 — Migração do Banco de Dados

O campo `address` atual mistura logradouro + número + bairro em um único texto. Será preciso separar esses dados em colunas distintas para suportar a busca por CEP corretamente.

**Novos campos na tabela `contacts`:**

| Coluna | Tipo | Descrição |
|---|---|---|
| `cep` | `VARCHAR(9)` | CEP formatado (ex: 01310-100) |
| `address_number` | `VARCHAR(20)` | Número do endereço |
| `neighborhood` | `VARCHAR` | Bairro |

O campo `address` existente passa a guardar apenas o logradouro (nome da rua), sem quebrar dados de clientes já cadastrados.

---

### Parte 2 — Atualização do Hook `useContacts.ts`

- Adicionar `cep`, `address_number` e `neighborhood` à interface `Contact` e ao tipo `ContactInsert`.
- Adicionar os rótulos dos novos campos (`cep`, `address_number`, `neighborhood`) ao mapa de `fieldLabels` dentro de `updateContact`, para que o log de auditoria registre corretamente as alterações nesses campos.

---

### Parte 3 — Reformulação do Layout de Endereço

O layout atual (Endereço | Cidade | Estado em 3 colunas) será expandido para dois grupos de linha:

**Linha 4a — CEP + Logradouro:**
```text
[ CEP (1 col) ]  [ Logradouro / Rua (2 cols) ]
```

**Linha 4b — Número + Bairro + Cidade + Estado:**
```text
[ Nº (0.75) ]  [ Bairro (1.25) ]  [ Cidade (1) ]  [ Estado (1) ]
```

A grade externa `grid-cols-3` será mantida com as linhas internas usando `grid-cols-4` para acomodar todos os campos sem comprometer a legibilidade.

---

### Parte 4 — Lógica de Busca de CEP (`handleFetchCep`)

**Novos estados adicionados ao componente:**
- `cep` — valor digitado (com máscara `99999-999`)
- `addressNumber` — número do endereço
- `neighborhood` — bairro
- `isLoadingCep` — controla o spinner no campo CEP

**Fluxo da função `handleFetchCep` (disparada no `onBlur` do campo CEP):**

1. Remove caracteres não numéricos do CEP.
2. Se tiver menos de 8 dígitos, retorna silenciosamente (sem toast).
3. Ativa `isLoadingCep = true` (exibe spinner).
4. Faz `fetch` para `https://brasilapi.com.br/api/cep/v2/{cep}`.
5. Se a resposta for bem-sucedida:
   - Sobrescreve `address` com `data.street`
   - Sobrescreve `neighborhood` com `data.neighborhood`
   - Sobrescreve `city` com `data.city`
   - Sobrescreve `state` com `data.state`
   - **Não limpa** `addressNumber` (preserva o que o usuário já digitou)
   - Move o foco para o campo Número via `document.getElementById('address-number')?.focus()`
6. Se a resposta falhar:
   - Exibe Toast com título "CEP não encontrado" e instrução para preenchimento manual
   - **Não limpa nenhum campo** de endereço existente
7. Desativa `isLoadingCep = false` no bloco `finally`.

**Regra de Conflito CNPJ vs. CEP:**
- A busca CNPJ preenche os campos de endereço com os dados fiscais.
- A busca de CEP (por `onBlur`) sempre sobrescreve o endereço, pois representa a escolha explícita do usuário — permitindo cadastrar um endereço diferente do endereço fiscal do CNPJ.
- A busca CNPJ será atualizada para preencher `address`, `addressNumber` e `neighborhood` separadamente (atualmente ela os concatena em um único campo).

---

### Parte 5 — UI do Campo CEP

- Máscara automática aplicada no `onChange`: `99999-999`.
- Indicador visual de loading com `Loader2` (spinner) posicionado absolutamente dentro do input à direita, visível apenas quando `isLoadingCep === true`.
- O campo CEP fica habilitado independentemente de `addressFieldsLocked` (que só bloqueia durante a busca CNPJ ativa).

---

### Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---|---|
| Nova migração SQL | Adicionar colunas `cep`, `address_number`, `neighborhood` à tabela `contacts` |
| `src/hooks/useContacts.ts` | Adicionar novos campos à interface `Contact` e `ContactInsert` |
| `src/components/contacts/ContactFormDialog.tsx` | Novos estados, função `handleFetchCep`, novo layout de endereço, máscara CEP e spinner |

**Nenhuma alteração na página `Boletos.tsx` ou em outros arquivos é necessária.**
