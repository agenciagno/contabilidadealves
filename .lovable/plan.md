
# Plano: PWA Update Banner + Install Banner

## Aviso importante
O PWA com Service Worker **só funcionará na versão publicada** (contabilidadealves.lovable.app). No preview do editor Lovable, o Service Worker será desativado para evitar cache stale.

## Etapas

### 1. Instalar dependência
- `bun add vite-plugin-pwa`

### 2. Configurar VitePWA no `vite.config.ts`
- Adicionar plugin `VitePWA` com:
  - `registerType: "autoUpdate"`
  - `devOptions: { enabled: false }` (desativado no dev/preview)
  - `workbox.skipWaiting: true`, `clientsClaim: true`
  - `workbox.navigateFallbackDenylist: [/^\/~oauth/]`
  - `workbox.runtimeCaching` com `NetworkFirst` para navegações HTML
  - `manifest: false` (usar o manifest.json existente em public/)

### 3. Adicionar guard no `src/main.tsx`
- Desregistrar Service Workers quando em iframe ou host de preview Lovable, evitando problemas no editor.

### 4. Criar `src/components/PwaUpdateBanner.tsx`
- Usa `useRegisterSW` de `virtual:pwa-register/react`
- Quando `needRefresh` for true, exibe banner fixo na parte inferior
- Botão "Atualizar" chama `updateServiceWorker(true)`
- Botão X fecha o banner
- Estilo conforme especificado (dark glass, blur, #0A84FF accent)

### 5. Criar `src/components/PwaInstallBanner.tsx`
- Captura o evento `beforeinstallprompt` (Android/Chrome)
- Exibe banner convidando a instalar o app
- Botão "Instalar" chama `prompt()` do evento capturado
- Para iOS/Safari (onde `beforeinstallprompt` não existe), detecta via `navigator.standalone === false` em iOS e exibe instruções: "Toque em Compartilhar > Adicionar à Tela Inicial"
- Botão X fecha o banner; salva flag no localStorage para não reexibir na mesma sessão

### 6. Registrar no `src/App.tsx`
- Importar e adicionar `<PwaUpdateBanner />` e `<PwaInstallBanner />` fora do Router, visíveis em todas as páginas.

## Detalhes técnicos

### vite.config.ts (adições)
```ts
import { VitePWA } from "vite-plugin-pwa";

// Dentro do array plugins:
VitePWA({
  registerType: "autoUpdate",
  devOptions: { enabled: false },
  manifest: false,
  workbox: {
    skipWaiting: true,
    clientsClaim: true,
    navigateFallbackDenylist: [/^\/~oauth/],
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: { cacheName: "html", networkTimeoutSeconds: 3 },
      },
    ],
  },
})
```

### Arquivos criados/editados
| Arquivo | Ação |
|---|---|
| `vite.config.ts` | Editado — adiciona VitePWA plugin |
| `src/main.tsx` | Editado — guard contra SW em iframe/preview |
| `src/components/PwaUpdateBanner.tsx` | Criado |
| `src/components/PwaInstallBanner.tsx` | Criado |
| `src/App.tsx` | Editado — adiciona os dois banners |

Nenhuma tela, rota ou funcionalidade existente será alterada.
