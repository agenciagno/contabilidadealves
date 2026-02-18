
# Correções na Aba Documentos e Cadastro

## Diagnóstico

### Problema 1 — Botão "Upload" da tela inicial de Documentos
O botão `+ Upload` (linha 225 de `ContactDocumentsTab.tsx`) abre um `Dialog` com um dropzone estático (linhas 419–431). Este dropzone **não possui** as animações de `isPending`/`uploadSuccess` que existem no dropzone interno das categorias.

### Problema 2 — Aba Cadastro ainda com "Sócios"
O `ContactDetailsTab.tsx` ainda contém o card Sócios (linhas 154–214) e **não usa** o `ContactEditSheet` que foi criado. Os 4 cards de informação não têm ícone de editar.

---

## O Que Será Feito

### Arquivo 1: `src/components/contacts/ContactDocumentsTab.tsx`

#### Dropzone do Dialog (Upload Button)

O dropzone dentro do `<Dialog>` (linhas 419–431) será substituído por um dropzone com os mesmos 3 estados já existentes no dropzone interno:

| Estado | UI |
|---|---|
| `isPending` | `Loader2 animate-spin` + "Realizando upload..." |
| `uploadSuccess` | `CheckCircle2 animate-bounce text-emerald-500` + "Upload concluído!" |
| Normal | `Upload` + texto de instrução |

A `handleFileSelect` já chama `setUploadSuccess(true)` e o `setTimeout` — o dialog também fechará após o sucesso (já ocorre na linha 141: `setUploadDialogOpen(false)`). Como o dialog fecha logo após, a animação de sucesso aparecerá brevemente antes do fechamento — comportamento correto e natural.

O `onClick` do dropzone também precisa de guard: `!uploadDocument.isPending && !uploadSuccess`.

As classes de transição `transition-all duration-300` serão aplicadas ao dropzone do dialog assim como no interno.

---

### Arquivo 2: `src/components/contacts/ContactDetailsTab.tsx`

#### Remoção do Card "Sócios"
Remover completamente as linhas 154–240:
- Card de Sócios
- `PartnerFormDialog`
- `AlertDialog` de confirmação de exclusão
- Imports: `useContactPartners`, `PartnerFormDialog`, `Users`, `Plus`, `Edit2`, `Trash2`, `Percent`, `Badge`, `Skeleton`
- Estados: `partnerDialogOpen`, `editingPartner`, `deletePartnerId`
- Handlers: `handlePartnerSubmit`, `handleEditPartner`, `handleNewPartner`, `handleDeletePartner`

#### Adição de Ícone de Editar em Cada Card
Cada `CardHeader` receberá um botão com ícone `Pencil` alinhado à direita via `flex items-center justify-between`:

```tsx
<CardHeader className="flex flex-row items-center justify-between pb-3">
  <CardTitle className="text-base flex items-center gap-2">
    <Mail className="h-4 w-4" />
    Informações de Contato
  </CardTitle>
  <Button variant="ghost" size="icon" onClick={() => openSheet('contato')}>
    <Pencil className="h-4 w-4" />
  </Button>
</CardHeader>
```

#### Estado de Controle do Sheet
Um único estado controlará qual seção está aberta:

```tsx
const [editSection, setEditSection] = useState<Section | null>(null);
```

E um único `ContactEditSheet` no final do componente:

```tsx
{editSection && (
  <ContactEditSheet
    contact={contact}
    section={editSection}
    open={!!editSection}
    onOpenChange={(open) => !open && setEditSection(null)}
  />
)}
```

#### Mapeamento Seção → Card

| Card | section |
|---|---|
| Informações de Contato | `'contato'` |
| Endereço | `'endereco'` |
| Dados Fiscais | `'fiscal'` |
| Observações | `'observacoes'` |

---

## Resumo de Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/contacts/ContactDocumentsTab.tsx` | Adicionar estados de feedback (isPending/uploadSuccess) no dropzone do Dialog de upload |
| `src/components/contacts/ContactDetailsTab.tsx` | Remover card Sócios + imports; adicionar ícone Pencil em cada card + conectar ContactEditSheet |

Nenhuma mudança em banco de dados, hooks ou outros arquivos.
