## PWA - Progressive Web App (Manifest-only, sem Service Worker)

Abordagem simples e segura: manifest.json + meta tags + ícones. Sem service worker (evita problemas de cache no preview). O app será instalável via "Adicionar à Tela Inicial" no Chrome e Safari.

### 1. Gerar ícones PWA a partir da logo enviada
- `public/pwa-icon-192.png` (192x192)
- `public/pwa-icon-512.png` (512x512)
- `public/pwa-icon-512-maskable.png` (512x512, com padding para safe zone)
- `public/apple-touch-icon.png` (180x180)

Os ícones de 192 e 512 já foram gerados no `/dev-server/public/` durante a exploração. Basta confirmar que estão lá e criar os arquivos restantes.

### 2. Criar `public/manifest.json`
```json
{
  "name": "Contabilidade Alves",
  "short_name": "Alves",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f1729",
  "theme_color": "#0f1729",
  "orientation": "any",
  "icons": [192, 512, 512-maskable]
}
```

### 3. Atualizar `index.html`
- `lang="pt-BR"`
- `<meta name="viewport" ...>` com `viewport-fit=cover` e `maximum-scale=1`
- `<link rel="manifest" href="/manifest.json">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<meta name="theme-color" content="#0f1729">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Alves">`
- `<meta name="mobile-web-app-capable" content="yes">`

### Arquivos modificados
- `public/manifest.json` (novo)
- `public/pwa-icon-192.png` (novo)
- `public/pwa-icon-512.png` (novo)
- `public/pwa-icon-512-maskable.png` (novo)
- `public/apple-touch-icon.png` (novo)
- `index.html` (editado)

### Resultado
O app poderá ser instalado na tela inicial em Android (Chrome) e iOS (Safari) com o ícone personalizado da logo Alves.
