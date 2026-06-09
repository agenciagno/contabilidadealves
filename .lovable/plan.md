# Ajustes na Conciliação DRE × Pagar/Receber

Três melhorias na tela **Conciliação** (modal `DREConciliationModal.tsx`). Nenhuma lógica da DRE ou do Pagar/Receber é alterada — só ferramentas de inspeção e correção.

---

## 1. Detectar transações "suspeitas" (provável À Vista com data prevista preenchida)

**O problema:** o sistema não guarda um campo "à vista / à prazo" — isso é só uma escolha no formulário no momento do lançamento. Por isso não dá pra saber com 100% de certeza quais transações antigas foram lançadas como À Vista. O que dá pra fazer é usar uma **heurística** muito segura:

> Uma transação é considerada **provável À Vista** quando: está **paga** (`is_paid = true`) **E** tem `expected_date` preenchido **E** `expected_date = date` (foi paga exatamente no dia previsto).

Esse é justamente o padrão que o formulário antigo gerava ao marcar À Vista: data prevista = data de pagamento. Em transações À Prazo reais, o normal é a data de pagamento ser diferente da prevista (atraso, antecipação, etc.).

**O que muda visualmente na Conciliação:**

- Nova coluna na tabela principal: **"Suspeitas À Vista"** (soma do `amount` das transações que batem na heurística, dentro do grupo).
- Linhas de detalhe ganham um **selo amarelo "Provável À Vista"** ao lado do status, quando a transação bate na heurística.
- Tooltip explicando a regra exata, para o usuário entender que é uma sugestão de revisão, não uma afirmação.

Nenhuma transação é alterada automaticamente — só sinalizada.

---

## 2. Ações em massa dentro da Conciliação

Atualmente o detalhe é só leitura. Vou adicionar:

- **Checkbox** em cada linha de transação detalhada.
- **Checkbox "selecionar tudo"** no cabeçalho do detalhe de cada grupo.
- **Botão "Selecionar todas as suspeitas À Vista"** (atalho) no topo do detalhe.
- Barra de ação flutuante quando há seleção, com os botões:
  - **"Limpar Data Prevista"** → grava `expected_date = null` nas selecionadas (resolve o problema raiz: essas transações somem do Previsto da DRE e o número fica igual ao Pagar/Receber).
  - **"Editar em massa…"** → abre o `BulkEditDialog` existente (já suporta alterar categoria, conta corrente, datas, etc.).

Após qualquer ação em massa, a Conciliação recarrega automaticamente para refletir os novos números.

Confirmação antes de aplicar: modal "Confirmar limpeza de Data Prevista em X transações?" com a lista das descrições afetadas.

---

## 3. Coluna "Evento Contábil (subevento)" nos detalhes

Hoje o detalhe mostra: Data Prevista | Data Pagto. | Cliente/Fornecedor | Conta Corrente | Valor | Status.

Vou inserir, **logo depois do Cliente/Fornecedor**, a coluna:

- **Evento Contábil** → nome do **subevento** (categoria filha) da transação, ex.: `Honorários - IRPF`.

O grupo principal continua sendo o **macro evento** (`Receitas Operacionais`), como na DRE — sem alterar a lógica de agrupamento. Quando a transação está vinculada direto ao macro (sem subevento), a coluna mostra um "—".

A coluna também é incluída no **PDF exportado** quando o usuário expande grupos (mantemos o PDF resumido atual; subevento entra na exportação detalhada se você quiser — me avise).

---

## Onde mudar

Apenas: `src/components/reports/DREConciliationModal.tsx`.

Eventual ajuste pequeno no `BulkEditDialog.tsx` só para garantir que aceita "limpar" (null) em `expected_date`, caso ainda não permita.

---

## Resumo

| Item | Muda? |
|---|---|
| Cálculo da DRE | Não |
| Cálculo do Pagar/Receber | Não |
| Agrupamento por macro evento | Não (continua igual à DRE) |
| Tabela principal | + coluna "Suspeitas À Vista" |
| Detalhe expandido | + coluna "Evento Contábil (subevento)", + checkboxes, + selo "Provável À Vista" |
| Ações em massa | "Limpar Data Prevista" e "Editar em massa…" |

Posso seguir com essa implementação?
