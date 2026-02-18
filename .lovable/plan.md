
## Correção: Preencher CEP na busca por CNPJ

### Diagnóstico

A função `handleFetchCnpj` em `ContactFormDialog.tsx` (linha 114–143) preenche `address`, `addressNumber`, `neighborhood`, `city` e `state` com os dados da BrasilAPI — mas **omite o campo `cep`**, mesmo que ele já esteja presente na resposta da API e mapeado na interface `CnpjData`.

A API da BrasilAPI retorna o CEP sem formatação (ex: `"01310100"`), por isso é necessário aplicar a função `maskCep` antes de salvar no estado.

---

### Solução

**1 arquivo alterado — `src/components/contacts/ContactFormDialog.tsx`**

Dentro de `handleFetchCnpj`, logo após `setName(...)`, adicionar:

```typescript
// Antes (linha 117-122 — sem CEP):
setName(data.nome_fantasia || data.razao_social);
setAddress(data.logradouro || '');
setAddressNumber(data.numero || '');
setNeighborhood(data.bairro || '');
setCity(data.municipio || '');
setState(data.uf || '');

// Depois (com CEP adicionado):
setName(data.nome_fantasia || data.razao_social);
setCep(data.cep ? maskCep(data.cep) : '');   // ← linha adicionada
setAddress(data.logradouro || '');
setAddressNumber(data.numero || '');
setNeighborhood(data.bairro || '');
setCity(data.municipio || '');
setState(data.uf || '');
```

A função `maskCep` já existe no arquivo (linha 29–34) e formata `"01310100"` → `"01310-100"`.

---

### Comportamento resultante

| Ação do usuário | Resultado |
|---|---|
| Clica em "Buscar CNPJ" | CEP + todos os campos de endereço são preenchidos automaticamente |
| Digita um CEP manualmente e sai do campo (onBlur) | CEP dispara busca e **sobrescreve** os campos de endereço existentes |
| Edita um campo de endereço diretamente | Apenas aquele campo é alterado, CEP não muda |

---

### Escopo da mudança

- Arquivo alterado: `src/components/contacts/ContactFormDialog.tsx`
- Linhas modificadas: bloco `handleFetchCnpj` (+1 linha)
- Nenhuma migração de banco de dados necessária
- Nenhum outro arquivo alterado
