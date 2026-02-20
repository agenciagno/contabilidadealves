
# Ajustes no Dashboard: Contas Pendentes e Remoção de Card

## Arquivo Modificado

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | Alterar link "Ver Todos" e remover card "Últimas 10 Movimentações" |

---

## 1. Redirecionar "Ver Todos" de Contas Pendentes

**Linha 848**: Alterar o destino do link de `/movimentacoes` para `/financeiro/pagar-receber`.

Antes:
```
<Link to="/movimentacoes" ...>
```

Depois:
```
<Link to="/financeiro/pagar-receber" ...>
```

---

## 2. Excluir Card "Últimas 10 Movimentações"

**Linhas 919-986**: Remover completamente o bloco do card "Últimas 10 Movimentações" (incluindo o wrapper `isWidgetEnabled('recentTransactions')`).

Isso também permite remover a variável `recentTransactions` caso não seja mais utilizada em nenhum outro lugar do componente.
