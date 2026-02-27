

# Correção no Fluxo de Importação de Planilha

## Problema Encontrado

O `useCallback` do `processFile` na linha 323 do `ImportSpreadsheetDialog.tsx` tem dependências incompletas:

```typescript
// Atual (linha 323):
}, [banks, categories, contacts, toast]);

// Faltam:
}, [banks, categories, contacts, toast, onCreateCategory, onCreateContact, onCreateBank]);
```

Isso causa um bug de **stale closure**: os callbacks `onCreateCategory`, `onCreateContact` e `onCreateBank` podem não ser chamados corretamente se mudarem entre renders.

## Verificação Visual

- Step 1 (Modelo): OK - template baixa corretamente com os 11 headers atualizados
- Step 2 (Upload): OK - drag-and-drop e seleção de arquivo funcionam visualmente
- Step 3 (Revisar): Não foi possível testar via automação (limitação do browser tool para upload de arquivos)
- Navegação entre steps (Próximo/Voltar): OK

## Correção

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | Adicionar `onCreateCategory`, `onCreateContact`, `onCreateBank` ao array de dependências do `useCallback` na linha 323 |

## Recomendação

Após a correção, recomendo que você teste manualmente: baixe o modelo, preencha com dados incluindo nomes de Evento Contábil, Cliente/Fornecedor e Conta Bancária que **não existem** no sistema, faça o upload e confirme que foram criados automaticamente nas respectivas abas.

