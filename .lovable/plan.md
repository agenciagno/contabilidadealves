

# Melhorar Layout da Lista de Boletos

## Resumo

Redesenhar o layout dos cards de boleto e adicionar totalizador ao final da lista.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/pages/Boletos.tsx` | Redesenhar card do boleto e adicionar total ao final |

---

## Novo Layout do Card

```text
+----------------------------------------------------------+------------------+
| Nome do Cliente (negrito)                                 |                  |
| CNPJ: XX.XXX  Email: x@x  Tel: (XX)XXXX  Venc: DD/MM/AA | R$ 1.500,00  GERADO |
+----------------------------------------------------------+------------------+
```

### Detalhes:
- **Linha 1**: Nome do cliente (`text-sm font-bold`)
- **Linha 2**: CNPJ, Email, Telefone, Vencimento completo (DD/MM/AAAA) - tudo em `text-xs text-muted-foreground`, com labels (CNPJ:, Email:, Tel:, Venc:)
- **Lado direito isolado**: Valor em destaque (`font-bold text-sm`) e ao lado o Badge de status (Pendente/Gerado) - ambos alinhados verticalmente ao centro
- Manter botoes de copia nos dados de contato (CNPJ, Email, Telefone)
- Manter badge clicavel para alternar status

### Calculo do vencimento completo:
```typescript
const dueDate = boleto.boleto_due_day != null
  ? format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), boleto.boleto_due_day), 'dd/MM/yyyy')
  : null;
```

---

## Total ao Final da Lista

Apos o ultimo card, bloco de totalizacao:

```text
+-------------------------------------------------------+
|                              Total: R$ XX.XXX,XX       |
+-------------------------------------------------------+
```

- Somar `boleto_value` de todos os itens em `filteredList`
- `font-bold text-base` alinhado a direita
- Visivel em tela e na impressao

---

## Secao Tecnica

### Estrutura JSX do card:

```text
<Card>
  <CardContent className="p-3">
    <div className="flex items-center justify-between gap-4">
      {/* Lado esquerdo: info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{nome}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {CNPJ + CopyBtn}
          {Email + CopyBtn}
          {Tel + CopyBtn}
          {Venc: DD/MM/AAAA}
        </div>
      </div>
      {/* Lado direito: valor + status */}
      <div className="flex items-center gap-3 shrink-0">
        <p className="font-bold text-sm">R$ 1.500,00</p>
        <Badge>PENDENTE / GERADO</Badge>
      </div>
    </div>
  </CardContent>
</Card>
```

### Totalizador:

```typescript
const totalValue = filteredList.reduce((sum, b) => sum + (b.boleto_value ?? 0), 0);
```

Renderizado apos o map dos cards, visivel tanto em tela quanto na impressao.

