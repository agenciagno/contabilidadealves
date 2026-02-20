

# Melhorias no Relatorio de Bancos

## Resumo

Tres ajustes no componente `BankReportModal.tsx`:
1. Adicionar botao de exportacao CSV e renomear o botao Excel existente
2. Padronizar cabecalho em todos os formatos de exportacao (PDF, XLS, CSV, OFX, Imagem)
3. Exibir Evento Contabil no cabecalho (Preview e exportacoes)

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/banks/BankReportModal.tsx` | Adicionar CSV, renomear XLS, padronizar cabecalho, exibir evento contabil |

---

## 1. Renomear botao Excel e adicionar CSV

- Botao existente "Excel" passa a ser **"Excel - XLS"**
- Novo botao **"Excel - CSV"** ao lado, com icone `Table2` (mesma cor verde)
- O grid de exportacao passa de `grid-cols-2` para layout que acomode 5 botoes

---

## 2. Nova funcao `exportCSV`

Gera arquivo `.csv` com separador ponto-e-virgula (padrao BR) contendo:
- Cabecalho com nome da empresa, periodo, contas e evento contabil (como comentarios ou linhas iniciais)
- Colunas: Data, Banco, Historico, Cliente/Fornecedor, Evento Contabil, Valor Entrada, Valor Saida, Saldo
- Mesmos dados de `filteredRows`
- Download automatico como `.csv`

---

## 3. Padronizar cabecalho em todos os formatos

Todas as exportacoes (PDF, XLS, CSV, OFX header, Imagem) passam a incluir:
- **Empresa**: nome da empresa
- **Periodo**: data inicio a data fim
- **Contas**: nomes dos bancos selecionados, ou **"Todas"** se nenhum selecionado
- **Evento Contabil**: nome da categoria selecionada, ou **"Todos"** se `categoryId === 'all'`

### Ajustes por formato:

**Preview (ref summaryRef)**:
- Quando nenhum banco selecionado, exibir "Contas: Todas" (atualmente nao mostra nada)
- Adicionar linha "Evento Contabil: [nome ou Todos]"

**PDF** (jsPDF):
- Adicionar linha de Contas e Evento Contabil abaixo do periodo (antes do resumo financeiro)

**XLS**:
- Adicionar linhas de cabecalho antes da tabela HTML (Empresa, Periodo, Contas, Evento Contabil)

**CSV**:
- Mesmas linhas de cabecalho no topo do arquivo

**Imagem**:
- Ja usa o summaryRef, entao herda automaticamente as mudancas do Preview

**OFX**:
- Formato tecnico, manter como esta (sem cabecalho visual)

---

## 4. Logica de exibicao de Contas e Eventos

```text
Contas:
  - Se selectedBankIds.length === 0 -> "Todas"
  - Se selectedBankIds.length > 0   -> nomes separados por virgula

Evento Contabil:
  - Se categoryId === 'all' -> "Todos"
  - Se categoryId !== 'all' -> nome da categoria (buscar em categories)
```

Variavel auxiliar para uso em todos os formatos:

```typescript
const accountsLabel = selectedBankIds.length > 0
  ? banks.filter(b => selectedBankIds.includes(b.id)).map(b => b.name).join(', ')
  : 'Todas';

const categoryLabel = categoryId !== 'all'
  ? categories.find(c => c.id === categoryId)?.name || 'Todos'
  : 'Todos';
```

---

## Secao Tecnica - Estrutura dos Botoes de Exportacao

```text
[PDF / Impressao]  [Excel - XLS]  [Excel - CSV]
[OFX]              [Imagem]
```

Grid ajustado para `grid-cols-3` na primeira linha e `grid-cols-2` na segunda, ou `grid-cols-3` com 5 itens fluindo naturalmente.

