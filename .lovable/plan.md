
# Ocultar Email e Telefone na Impressao dos Boletos

## Resumo

Adicionar a classe `print:hidden` nos elementos de Email e Telefone dentro do card de boleto, para que sejam ocultados apenas na impressao, mantendo-os visiveis na tela.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/pages/Boletos.tsx` | Adicionar `print:hidden` nos blocos de Email e Telefone |

---

## Detalhes

Duas alteracoes simples nas linhas 243-248 (Email) e 250-255 (Telefone):

- **Email (linha 243)**: Alterar `<div className="flex items-center">` para `<div className="flex items-center print:hidden">`
- **Telefone (linha 250)**: Alterar `<div className="flex items-center">` para `<div className="flex items-center print:hidden">`

### Resultado na impressao:

```text
Linha 1: Nome do Cliente
Linha 2: CNPJ: XX.XXX.XXX/XXXX-XX   Venc: DD/MM/AAAA        R$ 1.500,00  GERADO
```

### Resultado na tela (sem alteracao):

```text
Linha 1: Nome do Cliente
Linha 2: CNPJ: XX.XXX  Email: x@x  Tel: (XX)XXXX  Venc: DD/MM/AAAA   R$ 1.500,00  Gerado
```

Nenhuma outra alteracao necessaria. Os botoes de copia ja possuem `print-hidden` implicitamente por estarem dentro dos blocos ocultados.
