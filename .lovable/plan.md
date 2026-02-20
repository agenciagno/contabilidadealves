
# Corrigir Boletos Orfaos de Clientes Apagados

## Problema

Ao apagar um cliente, os registros na tabela `boleto_controls` nao sao removidos automaticamente. Isso gera cards com nome "—" na listagem de boletos.

Foram encontrados 11 registros orfaos de 2 contatos deletados, espalhados por varios meses.

---

## Solucao (2 etapas)

### 1. Migracao SQL

Uma unica migracao que:

- **Remove os registros orfaos existentes**: `DELETE FROM boleto_controls WHERE contact_id NOT IN (SELECT id FROM contacts)`
- **Adiciona ON DELETE CASCADE** na foreign key `boleto_controls.contact_id -> contacts.id`, para que futuras exclusoes de clientes removam automaticamente os boletos associados

```sql
-- Limpar orfaos
DELETE FROM boleto_controls
WHERE contact_id NOT IN (SELECT id FROM contacts);

-- Recriar FK com CASCADE
ALTER TABLE boleto_controls
  DROP CONSTRAINT IF EXISTS boleto_controls_contact_id_fkey;

ALTER TABLE boleto_controls
  ADD CONSTRAINT boleto_controls_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
```

### 2. Filtro defensivo no frontend (opcional, seguranca extra)

No hook `useBoletoControls.ts`, filtrar da lista final qualquer registro cujo contato nao foi encontrado, para evitar exibir cards com "—" mesmo em cenarios de inconsistencia:

```typescript
// Na construcao do boletoList, filtrar registros sem contato
const boletoList = boletoControls
  .map(bc => { ... })
  .filter(b => b.contact_name !== '—');
```

---

## Resultado

- Os 11 registros orfaos serao removidos imediatamente
- Futuras exclusoes de clientes removerao automaticamente seus boletos
- O frontend tera uma camada extra de protecao contra dados inconsistentes
