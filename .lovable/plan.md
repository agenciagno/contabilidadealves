
# Plano: Destaque Visual do Valor nas Linhas de Transação

## Diagnóstico Atual

Na linha 732 do `src/pages/Transactions.tsx`, o valor da transação está assim:

```tsx
<span className={`font-bold text-base tabular-nums ${...}`}>
  {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(...)}
</span>
```

- `text-base` = 16px — competindo com o nome do contato (também `text-sm`/`text-base`)
- Sem diferença de escala entre o valor e os outros textos da coluna direita
- O valor deveria ser o elemento dominante visualmente na coluna direita

---

## O Que Será Alterado

### Mudança no Valor (linha 732)

| Propriedade | Antes | Depois |
|---|---|---|
| Tamanho | `text-base` (16px) | `text-xl` (20px) |
| Peso | `font-bold` | `font-extrabold` |
| Tracking | — | `tracking-tight` |

A classe completa passará de:
```
font-bold text-base tabular-nums
```
Para:
```
font-extrabold text-xl tabular-nums tracking-tight
```

### Ajuste Complementar no Status Pill (linha 740)

Para manter a hierarquia correta (valor > pill), o badge de status ganha um toque extra de tamanho:

| Propriedade | Antes | Depois |
|---|---|---|
| Texto | `text-[10px]` | `text-xs` |
| Padding vertical | `py-0.5` | `py-1` |
| Padding horizontal | `px-2` | `px-2.5` |

### Ajuste no Ícone (linha 684)

O ícone à esquerda também sobe junto para equilibrar a hierarquia visual com o valor maior:

| Propriedade | Antes | Depois |
|---|---|---|
| Container | `w-9 h-9` | `w-10 h-10` |
| Ícone interno | `w-4 h-4` | `w-5 h-5` |
| Fundo | `bg-xxx/15` | `bg-xxx/20` |

### Padding do Row (linha 681)

| Antes | Depois |
|---|---|
| `py-3` | `py-3.5` |

---

## Resultado Visual

```
┌───────────────────────────────────────────────────────────┐
│  🟢  [03/06]  João Silva                  +R$ 1.500,00   │  ← valor em text-xl extrabold
│      💼 Honorários • Banco X • Receita    [ Recebido  ]  │  ← pill legível
└───────────────────────────────────────────────────────────┘
```

O `+R$ 1.500,00` em `text-xl font-extrabold` será imediatamente o ponto de foco da coluna direita, sem precisar procurar o número.

---

## Arquivo Modificado

| Arquivo | Linhas |
|---|---|
| `src/pages/Transactions.tsx` | 681, 684–691, 732, 740 |

Nenhuma mudança de lógica, banco de dados ou hooks. Apenas refinamento de classes Tailwind nas linhas de transação.
