## Objetivo
Expandir tipos TypeScript em `src/hooks/useContacts.ts` para refletir os campos já existentes na tabela `contacts` do Supabase. Sem mudanças de lógica, queries, mutations ou UI.

## Arquivo único alterado
`src/hooks/useContacts.ts`

## Mudanças

### 1. Interface `Contact`
Adicionar os campos listados pelo usuário, agrupados por seção:
- Dados empresariais: `razao_social`, `nome_fantasia`, `cnae_principal`, `cnaes_secundarios`, `natureza_juridica`, `situacao_cadastral`, `data_abertura_receita`
- Endereço: `complemento`
- Contato: `segundo_email_contato`
- Fiscais: `ie`, `im`, `regime_apuracao`, `numero_alvara`, `validade_alvara`
- Status/Classificação: `status_cliente`, `tipo_cliente`, `tipo_estabelecimento`, `grupo_escritorio`, `data_inicio_contrato`, `categorias`
- Datas por esfera (8 campos abertura/encerramento)
- Departamento Pessoal: `possui_funcionarios`, `numero_funcionarios`, `tipo_cartao_ponto`, `medicina_trabalho`, `grupo_cipa`, `registro_entradas`, `registro_saidas`, `registro_icms`, `inventario`
- Criptografado: `siare_senha_encrypted`

Tipos conforme especificação do usuário.

### 2. `ContactInsert`
Continua sendo derivado de `Contact` via `Omit`. Como todos os novos campos são opcionais no banco, marcá-los como opcionais na interseção do type (mantendo o padrão atual que já estende com `& { ... }` para campos opcionais). Para simplificar e seguir o padrão existente, manter `Omit<Contact, ...>` e adicionar uma cláusula `& Partial<Pick<Contact, '<novos_campos>'>>` para tornar os novos opcionais no insert.

### 3. `ContactUpdate`
Sem alteração — `Partial<ContactInsert>` propaga automaticamente.

### 4. `fieldLabels` em `updateContact.mutationFn`
Adicionar as 17 labels em português listadas pelo usuário (Razão Social, Nome Fantasia, CNAE Principal, etc.) ao objeto `fieldLabels` existente.

## O que NÃO muda
- Query `select('*')` — já traz tudo
- Nenhuma mutation, hook ou componente visual
- Mapeamentos especiais (`tax_regime`, `is_active`) permanecem como estão
