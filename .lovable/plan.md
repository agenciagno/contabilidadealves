
## Reformulação Completa do Módulo de Gestão de Contas/Bancos

### Visão Geral da Arquitetura

Este é um projeto de grande porte dividido em 5 frentes principais. Serão criados novos componentes dedicados e um hook especializado para busca de transações por banco, mantendo compatibilidade total com a estrutura existente.

---

### Componentes e Arquivos Envolvidos

```text
src/
├── pages/
│   └── Banks.tsx                          (reescrita completa)
├── components/banks/
│   ├── BankFormDialog.tsx                 (simplificação - remover cor)
│   ├── BankDetailSheet.tsx                (NOVO - gaveta de extrato individual)
│   ├── UnifiedStatementAccordion.tsx      (NOVO - extrato unificado com accordion)
│   └── BankReportModal.tsx                (NOVO - modal de geração de relatório)
└── hooks/
    └── useBankTransactions.ts             (NOVO - hook para transações por banco)
```

---

### Frente 1: Refinamento do Modal de Cadastro (`BankFormDialog.tsx`)

**Remover:**
- Constante `COLORS` (10 cores)
- Estado `color`
- Todo o bloco JSX do seletor de cores

**Manter e ajustar:**
- `Switch` de "Conta ativa" já existe e está correto (Shadcn UI)
- Campos: Nome, Código, Agência, Conta, Saldo Inicial, Ativo, Caixa Geral

**Na submissão, cor padrão será atribuída automaticamente:**
```tsx
// Paleta de cores rotativa por índice de criação
const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
// Cor aleatória da paleta ao criar
onSubmit({ name, ..., color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)] })
```

**Resultado:** Formulário com apenas: Nome, Código/Agência/Conta (linha compacta), Saldo Inicial, Switch ativo, Checkbox Caixa Geral.

---

### Frente 2: Hook de Dados (`useBankTransactions.ts`) — NOVO

Este hook centraliza toda a lógica de busca e cálculo de extrato:

```tsx
// Interface de retorno
interface BankStatementRow {
  id: string;
  date: string;
  contact_name: string | null;
  category_name: string | null;
  description: string;
  type: 'receita' | 'despesa';
  amount: number;
  signed_amount: number;   // positivo para receita, negativo para despesa
  running_balance: number; // saldo acumulado linha a linha
  is_paid: boolean;
}

// Lógica crítica de saldo (conforme especificação):
// 1. opening_balance = bank.initial_balance + SUM(transações ANTERIORES ao startDate com is_paid=true)
// 2. Cada linha: running_balance[i] = running_balance[i-1] + signed_amount[i]
```

O hook aceita filtros: `bankId`, `startDate`, `endDate`, `contactId`, `categoryId` e suporta `bankId = 'all'` para o extrato unificado.

**Consulta ao banco:**
```sql
SELECT transactions.*, contacts.name, categories.name, banks.name
FROM transactions
LEFT JOIN contacts ON ...
LEFT JOIN categories ON ...
LEFT JOIN banks ON ...
WHERE bank_id = :bankId 
  AND date BETWEEN :startDate AND :endDate
  AND (contact_id = :contactId OR :contactId IS NULL)
  AND (category_id = :categoryId OR :categoryId IS NULL)
ORDER BY date ASC, created_at ASC
```

---

### Frente 3: Gaveta de Extrato Individual (`BankDetailSheet.tsx`) — NOVO

**Trigger:** Clicar no Card do banco (área principal, excluindo botões de ação).

**Estrutura da Sheet (lateral direita, largura ampla — `w-full max-w-3xl`):**

```text
┌────────────────────────────────────────┐
│ [Building2]  Conta Corrente Bradesco   │
│              Saldo Atual: R$ 15.240,00 │
│              [Agência: 0001 • Conta: ] │
├── Filtros ─────────────────────────────┤
│ [📅 Data Início] [📅 Data Fim]         │
│ [Buscar Cliente/Fornecedor ▼]          │
│ [Evento Contábil ▼]                    │
├── Extrato ─────────────────────────────┤
│ Data     │ Cliente   │ Evento │ Valor  │ Saldo   │
│ 01/01/25 │ Empresa X │ Maint. │ +500   │ 10.500  │
│ 05/01/25 │ Fornec. Y │ Aluguel│ -1.200 │  9.300  │
└────────────────────────────────────────┘
```

**Colunas da tabela:**
1. Data (DD/MM/AAAA)
2. Cliente/Fornecedor
3. Evento Contábil
4. Valor — verde para receita (`+R$ X`), vermelho para despesa (`-R$ X`)
5. Saldo Acumulado — calculado com `opening_balance` correto

**Linha de abertura:** Antes das transações do período, exibir uma linha cinza "Saldo Inicial do Período: R$ X.XXX,XX".

---

### Frente 4: Extrato Unificado — Accordion (`UnifiedStatementAccordion.tsx`) — NOVO

Posicionado abaixo dos cards de bancos em `Banks.tsx`. Estado inicial: **fechado (collapsed)**.

**Estrutura:**
```tsx
<Accordion type="single" collapsible defaultValue={undefined}>
  <AccordionItem value="unified-statement">
    <AccordionTrigger>
      Extrato Unificado  <Badge>{totalTransactions}</Badge>
    </AccordionTrigger>
    <AccordionContent>
      {/* Filtros no topo */}
      {/* Tabela de extrato com coluna "Banco" adicional */}
    </AccordionContent>
  </Accordion>
</Accordion>
```

**Filtros internos:**
- Período: [Data Início] [Data Fim]
- Cliente/Fornecedor: Select com lista de contacts
- Evento Contábil: Select com lista de categories
- Banco: Select com lista de banks (multi-select simples — Select com "Todos")

**Colunas:** Data | Banco | Cliente/Fornecedor | Evento Contábil | Valor | Saldo Acumulado

**Lógica de saldo no extrato unificado:** O `opening_balance` é calculado como a soma dos saldos iniciais de todos os bancos ativos + todas as transações pagas anteriores ao período filtrado.

---

### Frente 5: Modal de Relatório (`BankReportModal.tsx`) — NOVO

**Trigger:** Botão "Gerar Relatório" no topo da página `Banks.tsx` (ao lado de "Novo Banco").

**Estrutura do Modal (Dialog — `sm:max-w-2xl`):**

```text
┌─────────────────────────────────────────────┐
│ Gerar Relatório de Extrato                  │
├── Configuração ─────────────────────────────┤
│ Período: [Data Início ▼]  [Data Fim ▼]      │
│ Banco:   [Multi-Select com checkboxes ▼]    │
│ Evento:  [Select ▼]                         │
├── Preview (Resumo) ─────────────────────────┤
│ Saldo Inicial do Período:   R$ X.XXX,XX     │
│ Total de Entradas:   (+)    R$ X.XXX,XX     │
│ Total de Saídas:     (-)    R$ X.XXX,XX     │
│ Saldo Final:                R$ X.XXX,XX     │
│ N° de lançamentos: XX                       │
├── Exportar ─────────────────────────────────┤
│ [PDF Gestão] [Excel Analítico] [OFX] [PNG]  │
└─────────────────────────────────────────────┘
```

---

### Frente 6: Exportações

#### 6a. PDF Gestão
- Usa `jsPDF` + `jspdf-autotable` (já instalados)
- Cabeçalho: Logo da empresa (de `company.logo_url`) + Nome + CNPJ
- Tabela: Data | Cliente/Fornecedor | Evento | Entrada | Saída | Saldo
- Rodapé em cada página: "Gerado em DD/MM/AAAA às HH:MM"
- Layout preto e branco, fonte 9px, tema `striped`

#### 6b. Excel Analítico
- Usa geração manual de CSV com separador de colunas bem definido para abertura no Excel
- **Colunas separadas:** Data | Histórico | Valor Entrada | Valor Saída | Saldo
- Encodes valor receita na coluna Entrada, despesa na coluna Saída (para fórmulas nativas do Excel)
- Arquivo `.csv` com UTF-8 BOM, download direto

#### 6c. OFX Contábil
- Geração de string XML no padrão OFX 2.x compatível com Domínio/Contmatic
- Header OFX obrigatório:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER:100 DATA:OFXSGML VERSION:151 ...?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT ou DEBIT</TRNTYPE>
            <DTPOSTED>YYYYMMDD</DTPOSTED>
            <TRNAMT>valor positivo ou negativo</TRNAMT>
            <FITID>id único</FITID>
            <MEMO>Descrição + Parceiro</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
```
- `TRNTYPE`: `CREDIT` para receita, `DEBIT` para despesa
- `TRNAMT`: valor positivo para receita, negativo para despesa
- `MEMO`: `{description} - {contact_name || 'Sem parceiro'}`

#### 6d. PNG (Compartilhar)
- Usa `html2canvas` (será instalado via importação dinâmica ou adicionado ao projeto)
- Renderiza um componente React de "Card de Resumo" estilizado (não a tabela completa)
- O card inclui: Nome do banco / período, Saldo Inicial, Entradas, Saídas, Saldo Final
- Download como `extrato-{banco}-{data}.png`
- Nota: `html2canvas` não está instalado — será necessário adicionar como dependência

---

### Lógica Crítica de Saldo Acumulado

```
DADO: bank.initial_balance = R$ 10.000,00
DADO: Transações anteriores ao filtro (is_paid=true): -R$ 500,00
DADO: startDate = 01/02/2025

opening_balance = 10.000 + (-500) = R$ 9.500,00

Linha 1 (01/02): Receita R$ 300 → saldo = 9.500 + 300 = R$ 9.800,00
Linha 2 (05/02): Despesa R$ 800 → saldo = 9.800 - 800 = R$ 9.000,00
```

Esta lógica é implementada no `useBankTransactions.ts` com **duas queries separadas**:
1. Query de `opening_balance`: busca todas as transações com `is_paid=true` e `date < startDate`
2. Query do período: busca transações do período com os filtros aplicados

---

### Resumo dos Arquivos

| Arquivo | Ação | Impacto |
|---|---|---|
| `src/components/banks/BankFormDialog.tsx` | Editar — remover seletor de cor | Pequeno |
| `src/hooks/useBankTransactions.ts` | Criar — hook de extrato com lógica de saldo | Médio |
| `src/components/banks/BankDetailSheet.tsx` | Criar — gaveta de extrato individual | Grande |
| `src/components/banks/UnifiedStatementAccordion.tsx` | Criar — accordion de extrato unificado | Grande |
| `src/components/banks/BankReportModal.tsx` | Criar — modal + 4 formatos de exportação | Grande |
| `src/pages/Banks.tsx` | Editar — integrar todos os novos componentes | Médio |

**Total: 1 arquivo editado de menor porte + 4 arquivos criados + 1 arquivo editado de integração**

---

### Nota sobre Dependência Externa

Para a exportação PNG, será necessário instalar `html2canvas`. Esta biblioteca permite renderizar um elemento HTML como imagem canvas. A instalação ocorre automaticamente com a implementação.

