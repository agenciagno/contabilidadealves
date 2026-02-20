

# Redesenhar Cabecalho do PDF para Corresponder ao Preview

## Resumo

Atualizar a funcao `exportPDF` em `BankReportModal.tsx` para que o cabecalho do PDF tenha o mesmo design visual da imagem de referencia (Preview), com cards coloridos para Saldo Inicial, Entradas, Saidas e Saldo Final.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/banks/BankReportModal.tsx` | Redesenhar cabecalho do PDF com cards visuais |

---

## Design Atual vs Desejado

**Atual**: Cabecalho do PDF usa texto simples em uma unica linha ("Saldo Inicial: R$ 0,00 | Entradas: R$ 1.000,00 | ...").

**Desejado**: Reproduzir o layout do Preview com:
1. Nome da empresa em negrito (grande)
2. Periodo, Contas, Evento Contabil em texto menor abaixo
3. Grid 2x2 de cards coloridos com cantos arredondados:
   - **Saldo Inicial**: fundo cinza claro (#F5F5F5), texto preto
   - **Entradas**: fundo verde claro (#F0FFF4), label e valor em verde escuro (#15803D), prefixo "+"
   - **Saidas**: fundo vermelho claro (#FFF5F5), label e valor em vermelho (#DC2626), prefixo "-"
   - **Saldo Final**: fundo azul claro (#EFF6FF), label e valor em azul escuro (#1D4ED8)
4. Separador fino
5. Rodape do resumo: "X lancamentos - Gerado em DD/MM/YYYY"

---

## Implementacao Tecnica

Substituir as linhas 110-115 (resumo financeiro em texto) por desenho com `jsPDF`:

```text
// Para cada card:
doc.setFillColor(r, g, b);       // cor de fundo
doc.roundedRect(x, y, w, h, 3, 3, 'F');  // retangulo arredondado
doc.setTextColor(r, g, b);       // cor do texto
doc.text(label, x+4, y+8);      // label pequeno
doc.text(valor, x+4, y+16);     // valor em negrito
```

Layout dos 4 cards no PDF (2 colunas, 2 linhas):

```text
Posicao no PDF (A4, margens 14mm):
Col 1: x=14, largura=88
Col 2: x=104, largura=88

Linha 1: y=58  (Saldo Inicial | Entradas)
Linha 2: y=80  (Saidas | Saldo Final)
```

Apos os cards, desenhar linha separadora e texto de rodape do resumo com contagem de lancamentos e data.

A tabela `autoTable` comecara apos o bloco de cards (~y=110).

