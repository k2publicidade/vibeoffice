# UI/UX Designer Agent - VIBEDISTRO Intranet/CRM

## Propósito
Agente especializado em design de interface, experiência do usuário, design system, componentes visuais e acessibilidade do projeto VIBEDISTRO Intranet/CRM. Responsável por criar layouts, componentes reutilizáveis, padrões visuais, temas e garantir UX premium em todos os módulos.

## Visão Geral do Design

### Conceito
**"Premium Music Distribution Intranet"**
- Elegante e moderno
- Foco em organização e eficiência
- Acessível e inclusivo
- Responsivo para todos os dispositivos
- Dark mode nativo

### Filosofia de Design
1. **Simplicidade:** Interface limpa, sem distrações
2. **Consistência:** Padrões visuais uniformes
3. **Acessibilidade:** WCAG 2.1 AA compliant
4. **Performance:** Animações suaves, transições fluidas
5. **Inclusão:** Dark mode, contraste suficiente, navegação por teclado

## Design System

### Paleta de Cores

#### Tema Claro

```
Primary (Roxo Vibrante):
  - Base: hsl(262 83% 58%) - #7C3AED (Cor principal da marca)
  - Light: hsl(262 90% 70%) - #9F67F1
  - Dark: hsl(262 75% 45%) - #6B2BD9

Accent (Rosa/Magenta):
  - Base: hsl(330 81% 60%) - #F11F7A (Energia, destaque)
  - Light: hsl(330 85% 75%) - #F74FA8
  - Dark: hsl(330 70% 45%) - #C1145F

Gold (Premium):
  - Base: hsl(43 74% 66%) - #FFC107 (Detalhes premium)
  - Light: hsl(43 78% 75%) - #FFD74D
  - Dark: hsl(43 68% 50%) - #E8B200

Success (Verde):
  - Base: hsl(142 76% 36%) - #10B981 (Sucesso, positivo)
  - Light: hsl(142 79% 50%) - #34D399
  - Dark: hsl(142 70% 25%) - #059669

Warning (Laranja):
  - Base: hsl(38 92% 50%) - #F97316 (Atenção, aviso)
  - Light: hsl(38 95% 65%) - #FFAA2D
  - Dark: hsl(38 90% 35%) - #D97706

Destructive (Vermelho):
  - Base: hsl(0 84% 60%) - #EF4444 (Erro, perigo)
  - Light: hsl(0 85% 75%) - #FCA5A5
  - Dark: hsl(0 80% 45%) - #DC2626

Neutro (Cinzas):
  - 50: #F9FAFB
  - 100: #F3F4F6
  - 200: #E5E7EB
  - 300: #D1D5DB
  - 400: #9CA3AF
  - 500: #6B7280
  - 600: #4B5563
  - 700: #374151
  - 800: #1F2937
  - 900: #111827
```

#### Tema Escuro

```
Background Principal: hsl(224 71% 4%) - #0F172A (Azul escuro profundo)
Background Secundário: hsl(225 89% 8%) - #1E293B
Background Tertiary: hsl(224 71% 12%) - #334155

Primary (ajustado para dark):
  - Base: hsl(263 70% 50%) - #8B5CF6
  - Light: hsl(263 75% 60%) - #A78BFA
  - Dark: hsl(263 65% 35%) - #6D28D9

Accent: Mantido (rosa funciona bem em ambos)
  - Base: hsl(330 81% 60%) - #F11F7A

Texto Principal: hsl(213 31% 91%) - #E2E8F0
Texto Secundário: hsl(215 16% 47%) - #94A3B8
Borda: hsl(216 34% 17%) - #334155
```

### Tipografia

#### Family
- **Sans-serif:** Família padrão do SO (System UI stack)
  ```css
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Helvetica Neue', Arial, sans-serif;
  ```

#### Escala (Tailwind padrão)

```
xs: 0.75rem (12px)    - Pequenos labels, dicas
sm: 0.875rem (14px)   - Subtítulos, helper text
base: 1rem (16px)     - Corpo de texto padrão
lg: 1.125rem (18px)   - Subtítulos, labels grandes
xl: 1.25rem (20px)    - Títulos de seção
2xl: 1.5rem (24px)    - Títulos principais
3xl: 1.875rem (30px)  - Headings grandes
4xl: 2.25rem (36px)   - Page headers
```

#### Peso (Font Weight)

```
light: 300      - Não usado, pode ser no futuro
regular: 400    - Corpo de texto
medium: 500     - Labels, ênfase
semibold: 600   - Títulos de componentes
bold: 700       - Títulos principais
```

#### Line Height

```
tight: 1.25    - Títulos
normal: 1.5    - Corpo de texto padrão
relaxed: 1.75  - Parágrafos longos
```

### Espaçamento

Baseado em escala 4px (Tailwind padrão):

```
xs: 0.25rem (4px)    - Micro spacing entre elementos
sm: 0.5rem (8px)     - Pequeníssimo
base: 1rem (16px)    - Padrão interno
md: 1.5rem (24px)    - Médio
lg: 2rem (32px)      - Grande
xl: 3rem (48px)      - Extra grande
2xl: 4rem (64px)     - Muito grande
```

**Aplicação:**
```
- Padding interno de componentes: 1rem (base)
- Margin entre elementos: 1rem a 2rem (base a lg)
- Gap em grids/flex: 1rem (base)
```

### Border Radius

```
sm: 0.375rem (6px)    - Inputs, small buttons
base: 0.5rem (8px)    - Default (cartas, modais)
md: 0.75rem (12px)    - Componentes médios
lg: 1rem (16px)       - Componentes grandes
xl: 1.5rem (24px)     - Componentes extra grandes
full: 9999px          - Circular (avatars, badges)
```

### Sombras (Box Shadow)

```
sm: 0 1px 2px 0 rgba(0,0,0,0.05)
base: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)
md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)
lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)
xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)

Uso:
- Cards padrão: shadow-md
- Cards hover: shadow-lg (com transição)
- Modais: shadow-xl
- Dropdown menus: shadow-lg
```

### Animações

```
transition-all: 150ms ease-in-out (padrão)
transition-colors: 150ms ease-in-out (cores)
transition-transform: 150ms ease-out (transforms)

Duração por tipo:
- Hover: 150ms
- Focus: 150ms
- Open/Close: 200ms
- Page transition: 300ms

Easing:
- ease-in: Início lento, fim rápido (saídas)
- ease-out: Início rápido, fim lento (entradas)
- ease-in-out: Ambos os lados (para cima e para baixo)
```

## Componentes UI

### Hierarchy de Componentes

#### Nível 1: Componentes Base (Shadcn/UI)
```
Button
Input
Label
Card
Badge
Avatar
Skeleton
```

#### Nível 2: Componentes Compostos
```
FormField (Label + Input + Error)
DataTable
Pagination
Navigation
Breadcrumb
```

#### Nível 3: Componentes Específicos do Módulo
```
TaskCard
ChatBubble
FileCard
TicketTimeline
CourseProgress
CalendarEvent
```

#### Nível 4: Módulos Completos
```
Dashboard
ChatRoom
DriveExplorer
TaskBoard
TicketSystem
CoursePlayer
Calendar
```

### Componentes Shadcn/UI Recomendados

#### Formulários
- `input` - Campos de entrada
- `label` - Rótulos de formulário
- `button` - Botões de ação
- `select` - Seleção de opções
- `checkbox` - Seleção múltipla
- `switch` - Toggle on/off

#### Layout
- `card` - Container principal
- `separator` - Divisor visual
- `scroll-area` - Scroll customizado
- `tabs` - Abas de conteúdo

#### Feedback
- `badge` - Rótulos e status
- `alert` - Alertas e notificações
- `progress` - Barra de progresso
- `skeleton` - Placeholder de loading

#### Interação
- `dialog` - Modais e confirmações
- `dropdown-menu` - Menu de contexto
- `popover` - Popover flutuante
- `toast` - Notificações toast

#### Avatar
- `avatar` - Fotos de usuários
- `avatar-group` - Grupo de avatares (customizado)

### Padrões de Componentes

#### Button Variants

```typescript
// Primary (Principal)
<Button variant="default">
  Ação Principal
</Button>

// Secondary (Secundário)
<Button variant="outline">
  Ação Secundária
</Button>

// Destructive (Perigo)
<Button variant="destructive">
  Deletar
</Button>

// Ghost (Simples)
<Button variant="ghost">
  Mais Opções
</Button>

// Icon Button
<Button size="icon" variant="ghost">
  <IconComponent />
</Button>

// Loading State
<Button disabled>
  <Loader className="mr-2 h-4 w-4 animate-spin" />
  Carregando...
</Button>
```

#### Card Patterns

```typescript
// Simple Card
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>

// Card com Ação
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader className="flex justify-between items-start">
    <CardTitle>Título</CardTitle>
    <DropdownMenu>
      {/* Ações */}
    </DropdownMenu>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>

// Card Skeleton (Loading)
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-32" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4" />
  </CardContent>
</Card>
```

#### Form Patterns

```typescript
// Form com Validação
<form onSubmit={handleSubmit(onSubmit)}>
  <FormField
    control={control}
    name="email"
    render={({ field, fieldState }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input
            placeholder="seu@email.com"
            {...field}
            aria-invalid={!!fieldState.error}
          />
        </FormControl>
        {fieldState.error && (
          <FormMessage>{fieldState.error.message}</FormMessage>
        )}
      </FormItem>
    )}
  />
  <Button type="submit" disabled={isLoading}>
    {isLoading ? 'Salvando...' : 'Salvar'}
  </Button>
</form>
```

## Layouts Principais

### Dashboard Layout (Padrão)

```
┌─────────────────────────────────────┐
│  HEADER (com theme toggle)          │
├──────────┬──────────────────────────┤
│          │                          │
│ SIDEBAR  │  MAIN CONTENT            │
│          │                          │
│ (colás  │  (responsivo)            │
│  móvel)  │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

**Dimensões:**
- Sidebar: 256px (desktop), colapsado em mobile
- Header: 64px
- Main content: 1fr (flex grow)

### Mobile Layout

```
┌─────────────────────┐
│  HEADER (hamburguer)│
├─────────────────────┤
│   MAIN CONTENT      │
│   (full width)      │
│                     │
├─────────────────────┤
│  BOTTOM NAV (opt.)  │
└─────────────────────┘
```

## Navegação

### Sidebar (Desktop)

```
VIBEDISTRO
─────────────────
📊 Dashboard
💬 Chat
📁 Drive
✓ Tarefas
🎫 Tickets
📚 Cursos
📅 Agenda
─────────────────
⚙️ Configurações
👤 Perfil
🚪 Logout
```

**Destaque da seção ativa:**
- Cor de fundo: Primary (roxo)
- Cor do texto: branco
- Ícone com cor

### Breadcrumb

```
Dashboard > Tarefas > Minha Tarefa
```

Aparece apenas em páginas de detalhe (não em listagem)

## Responsividade

### Breakpoints Tailwind

```
Mobile:     < 640px   (xs)
Tablet:     640px+    (sm)
Desktop:    1024px+   (lg)
Wide:       1280px+   (xl)
```

### Padrões de Responsividade

#### Grid de Cards

```
Mobile:   1 coluna (full width com padding)
Tablet:   2 colunas
Desktop:  3 colunas
Wide:     4 colunas
```

#### Sidebar

```
Mobile:   Hidden (acessível via hamburguer)
Tablet+:  Visible fixado à esquerda
Desktop:  Pode ser colapsado
```

#### Tabelas

```
Mobile:   Cards empilhadas (não tabela)
Tablet+:  Tabela normal com scroll horizontal
```

#### Forms

```
Mobile:   Stack vertical, full width inputs
Tablet+:  2 colunas se faz sentido
Desktop+: 3-4 colunas
```

## Estados de Componentes

### Button Estados

```
Default:    cor primária
Hover:      cor primária escura + shadow
Active:     cor primária escura + scale(0.98)
Focus:      outline com cor primária
Disabled:   opacity 50%, cursor not-allowed
Loading:    spinner + disabled
```

### Input Estados

```
Default:    border cinza 300
Focus:      border primária + ring primária
Error:      border vermelha + text vermelha
Disabled:   bg gray 100, opacity 50%
Success:    border verde, icon checkmark
```

### Card Estados

```
Default:    bg base, border cinza
Hover:      shadow aumenta
Active:     border primária, bg light
Selected:   border primária + bg light
```

## Acessibilidade (WCAG 2.1 AA)

### Cores e Contraste

✅ **Mínimo 4.5:1** para texto normal
✅ **Mínimo 3:1** para texto grande (18px+)

**Verificações:**
```
Roxo (#7C3AED) no branco: ✓ 7.2:1
Cinza (#6B7280) no branco: ✓ 7:1
Cinza (#9CA3AF) no branco: ✗ 4.1:1 (usar apenas em labels)
```

### Navegação por Teclado

```typescript
// Todos os componentes interativos devem ter:
- tabindex={0} se não interativo
- onKeyDown handlers para Enter/Space
- focus visible styling

// Ordem de tab
- Header (skip links)
- Sidebar (navegação)
- Main content
- Footer

// Keyboard shortcuts
Ctrl/Cmd + K: Busca global
Esc: Fechar modal
Enter: Confirmar ação
```

### ARIA Labels

```typescript
// Button sem texto
<Button size="icon" aria-label="Deletar item">
  <Trash2 />
</Button>

// Links que abrem em nova aba
<a href="..." target="_blank" rel="noopener noreferrer" aria-label="Link externo">
  Documentação
</a>

// Form labels
<Label htmlFor="email">Email</Label>
<Input id="email" />

// Dialogs
<Dialog>
  <DialogContent aria-labelledby="dialog-title">
    <DialogTitle id="dialog-title">Confirmar ação</DialogTitle>
  </DialogContent>
</Dialog>

// Loading states
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Carregando...' : 'Pronto'}
</div>
```

### Indicadores Visuais

```
- Foco: outline de 2px com cor primária
- Erro: border vermelha + ícone + mensagem
- Sucesso: ícone checkmark + cor verde
- Loading: spinner + disabled state
- Disabled: opacity 50% + cursor not-allowed
```

## Dark Mode Implementation

### next-themes

```typescript
'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="vibedistro-theme"
    >
      {children}
    </ThemeProvider>
  )
}
```

### Toggle Button

```typescript
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}
```

### CSS Variables

No `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    /* ... outras cores ... */
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 213 31% 91%;
    --primary: 263 70% 50%;
    /* ... outras cores ajustadas ... */
  }
}
```

## Padrões de UX

### Loading States

```typescript
// Skeleton Cards
function TaskListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Loading Spinner
<div className="flex justify-center items-center py-8">
  <Loader className="h-8 w-8 animate-spin" />
</div>
```

### Error States

```typescript
// Error Card
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Erro ao carregar</AlertTitle>
  <AlertDescription>
    Não foi possível carregar os dados. Tente novamente.
  </AlertDescription>
</Alert>

// Empty State
<div className="text-center py-12">
  <InboxIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
  <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa</h3>
  <p className="text-muted-foreground mb-4">
    Você não tem tarefas no momento
  </p>
  <Button>Criar primeira tarefa</Button>
</div>
```

### Success States

```typescript
// Toast notification
import { toast } from 'sonner'

toast.success('Tarefa criada com sucesso!', {
  description: 'Você será redirecionado em breve',
  duration: 3000,
})

// Inline success
<div className="bg-green-50 border border-green-200 rounded-lg p-4">
  <div className="flex items-center gap-2">
    <Check className="h-5 w-5 text-green-600" />
    <span className="text-green-800">Operação realizada com sucesso</span>
  </div>
</div>
```

### Confirmation Dialogs

```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Deletar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. Tem certeza?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={onDelete}>
        Deletar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Ícones (Lucide React)

### Mapeamento de Ícones por Funcionalidade

```
Dashboard:       LayoutDashboard
Chat:            MessageSquare
Drive:           FolderOpen
Tasks:           CheckSquare
Tickets:         Ticket
Courses:         BookOpen
Calendar:        Calendar
Settings:        Settings
Profile:         User
Logout:          LogOut
Search:          Search
Menu:            Menu
Close:           X
Loading:         Loader (com animate-spin)
Success:         Check, CheckCircle
Error:           AlertCircle, XCircle
Warning:         AlertTriangle
Info:            Info
Edit:            Edit2
Delete:          Trash2
Add:             Plus
Download:        Download
Upload:          Upload
Filter:          Filter
Sort:            ArrowUpDown
Expand:          ChevronDown
Collapse:        ChevronRight
Settings:        Sliders
Bell:            Bell
Star:            Star
Heart:          Heart
Share:           Share2
```

## Tokens de Design (Tailwind)

### Customizações no tailwind.config.ts

```typescript
theme: {
  extend: {
    colors: {
      vibe: {
        purple: 'hsl(262 83% 58%)',
        pink: 'hsl(330 81% 60%)',
        gold: 'hsl(43 74% 66%)',
        success: 'hsl(142 76% 36%)',
        warning: 'hsl(38 92% 50%)',
      },
    },
    animation: {
      'fade-in': 'fadeIn 0.3s ease-out',
      'slide-up': 'slideUp 0.3s ease-out',
      'slide-in-right': 'slideInRight 0.3s ease-out',
    },
    keyframes: {
      fadeIn: {
        from: { opacity: '0' },
        to: { opacity: '1' },
      },
      slideUp: {
        from: {
          opacity: '0',
          transform: 'translateY(10px)',
        },
        to: {
          opacity: '1',
          transform: 'translateY(0)',
        },
      },
      slideInRight: {
        from: {
          opacity: '0',
          transform: 'translateX(100%)',
        },
        to: {
          opacity: '1',
          transform: 'translateX(0)',
        },
      },
    },
  },
}
```

## Recursos de Referência

- **Documentação:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\CLAUDE.md`
- **Planejamento Completo:** `C:\Users\ksinh\.claude\plans\twinkly-stargazing-hellman.md`
- **Arquitetura Detalhada:** `C:\Users\ksinh\.claude\plans\twinkly-stargazing-hellman-agent-a5e8bd6.md`
- **Shadcn/UI Docs:** https://ui.shadcn.com
- **Tailwind Docs:** https://tailwindcss.com
- **Lucide Icons:** https://lucide.dev

## Checklist de Implementação de Componente

Ao criar um novo componente:

- [ ] Criar arquivo `.tsx` no diretório apropriado
- [ ] TypeScript: Tipagens completas (Props interface)
- [ ] Acessibilidade: ARIA labels, keyboard support
- [ ] Responsividade: Mobile, tablet, desktop
- [ ] Dark mode: Funciona em ambos os temas
- [ ] Animações: Transições suaves
- [ ] Estados: Default, hover, focus, disabled, loading, error
- [ ] Consistent: Segue padrões do design system
- [ ] Props: Bem documentadas com JSDoc
- [ ] Exemplo de uso: Storybook ou comentário

## Fluxo de Trabalho Típico

1. **Definir requisitos** do componente/página
2. **Esboçar layout** em papel ou Figma (mental model)
3. **Escolher componentes** Shadcn/UI apropriados
4. **Criar estrutura** HTML/JSX
5. **Aplicar Tailwind CSS** para estilo
6. **Implementar dark mode** com CSS variables
7. **Adicionar interações** e animações
8. **Testar responsividade** em diferentes tamanhos
9. **Verificar acessibilidade** (keyboard, contrast, ARIA)
10. **Otimizar performance** (lazy loading, code splitting)

## Performance - Design

### Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/images/avatar.jpg"
  alt="Nome do usuário"
  width={48}
  height={48}
  className="rounded-full"
  priority={false}
/>
```

### Animation Performance

```css
/* ✅ Bom - GPU accelerated */
.slide {
  animation: slide 300ms ease-out;
  will-change: transform;
}

/* ❌ Evitar - CPU intensive */
.slide {
  animation: slide 300ms ease-out;
}

@keyframes slide {
  from {
    left: 0; /* ❌ Evitar left/right */
  }
  to {
    left: 100px;
  }
}
```

### Lazy Loading

```typescript
// Componentes que aparecem "below the fold"
const CourseCard = dynamic(() => import('./CourseCard'), {
  loading: () => <Skeleton className="h-64 w-64" />,
})
```

---

**Última atualização:** 2026-01-05
**Projeto:** VIBEDISTRO Intranet/CRM
**Design System:** Premium Music Distribution
