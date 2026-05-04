## Atualização Visual da Tela de Login

Alterações exclusivamente visuais em `src/pages/Auth.tsx`:

### 1. Logo
- Remover o ícone `Building2` e o texto genérico do topo
- Substituir por `<img src="/Contabilidade_Alves_Branco.svg" />` com width 220px e margin-bottom 32px

### 2. Toggle Ver/Ocultar Senha
- Adicionar `useState` para `showPassword`
- Alternar `type` do input entre `password` e `text`
- Botão com ícones `Eye`/`EyeOff` do lucide-react, posicionado à direita dentro do campo (absolute)
- Sem borda/background, opacity 0.5 padrão e 1 no hover

### 3. Tokens do Design System no Card
- Card: `background: var(--apple-mat-card)`, `backdrop-filter: blur(20px)`, `border: 1px solid var(--apple-border-hair)`, `border-radius: var(--r-xl)`
- Inputs: `background: var(--apple-bg-base)`, `border: var(--apple-border-hair)`, `color: var(--apple-text-primary)`
- Botão primário: `background: var(--apple-blue)`, `border-radius: var(--r-pill)`
- Labels e texto secundário: `color: var(--apple-text-secondary)`
- Fundo da página: `var(--apple-bg-base)`

Nenhuma lógica de autenticação, validação ou rota será alterada.
