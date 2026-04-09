

## Plano: Corrigir Importação de Planilha — 679 Transações Devem Ser Importadas

### Problemas Identificados

**1. Linhas ignoradas silenciosamente (679 → 316)**

A linha 304 do `ImportSpreadsheetDialog.tsx` faz `if (amount == null) continue;` — qualquer linha onde `parseAmount` retorna `null` é descartada sem aviso. Isso acontece quando:

- A coluna "Valor" contém valores formatados como texto (ex: `"R$ 1.234,56"` com espaços non-breaking, ou `(1.234,56)` para negativos)
- A coluna "Valor" está vazia em algumas linhas
- O `sheet_to_json` do XLSX pode interpretar valores numéricos como strings dependendo da formatação do Excel

A função `parseAmount` (linha 68-77) faz `.replace(/[R$\s]/g, '')` mas **não trata**:
- Caracteres Unicode de espaço não-quebrável (`\u00A0`, `\xA0`)
- Formato de números negativos com parênteses `(1.234,56)`
- Traços ou hifens como zero `—`, `–`
- Valores com prefixo de moeda como `R$-1.234,56`

**2. Diferença nos valores (R$479.889,86 vs R$430.789,07)**

A diferença de ~R$49.100 pode ser causada por:
- Linhas ignoradas que tinham `Valor Pago/Recebido` preenchido
- `Math.abs()` alterando o sinal de valores que deveriam ser negativos na soma
- O banco mostra `SUM(paid_amount)` = 430.789,07, mas as 363 linhas ignoradas continham parte do valor total

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `ImportSpreadsheetDialog.tsx` | Corrigir `parseAmount` para tratar mais formatos; adicionar contagem de linhas ignoradas com feedback ao usuário |

### Detalhes Técnicos

**1. Corrigir `parseAmount` (mais robusto)**

```typescript
function parseAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    let s = value.trim();
    if (s === '' || s === '—' || s === '–' || s === '-') return null;
    // Detect parentheses as negative
    const isNeg = s.startsWith('(') && s.endsWith(')');
    if (isNeg) s = s.slice(1, -1);
    // Remove currency symbols, ALL whitespace variants (including non-breaking)
    s = s.replace(/[R$\u00A0\s]/gi, '');
    // Handle Brazilian format: 1.234,56 → 1234.56
    s = s.replace(/\./g, '').replace(',', '.');
    // Remove any remaining non-numeric except minus and dot
    s = s.replace(/[^\d.\-]/g, '');
    const num = parseFloat(s);
    if (isNaN(num)) return null;
    return isNeg ? -num : num;
  }
  return null;
}
```

**2. Adicionar feedback de linhas ignoradas**

Após o loop de processamento, se houver linhas ignoradas, mostrar um toast informando quantas linhas foram descartadas e o motivo (valor ausente/inválido):

```typescript
const skippedRows = rows.length - transactions.length;
if (skippedRows > 0) {
  toast({ 
    title: `${skippedRows} linha(s) ignorada(s)`,
    description: `Motivo: coluna "Valor" vazia ou com formato não reconhecido.`,
    variant: 'destructive'
  });
}
```

**3. Forçar leitura raw do XLSX**

Adicionar `raw: true` ao `XLSX.read` para evitar que o XLSX.js tente formatar valores automaticamente, o que pode converter números em strings:

```typescript
const workbook = XLSX.read(data, { type: 'array', raw: true });
```

E no `sheet_to_json`, usar `{ raw: false, defval: null }` para garantir que células vazias apareçam como `null` em vez de serem omitidas da row.

**4. Tratar `defval` para evitar perda de colunas**

```typescript
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
```

Isso garante que mesmo colunas vazias apareçam no objeto da linha, evitando que `get('Valor')` retorne `undefined` quando a célula existe mas está vazia.

### Resumo
- 1 arquivo editado (`ImportSpreadsheetDialog.tsx`)
- 0 migrations
- Corrige `parseAmount` para aceitar mais formatos brasileiros
- Adiciona `defval: null` no parser XLSX para não perder colunas vazias
- Adiciona feedback visual de linhas ignoradas

