# Sistema de Temas - Documentação Técnica

## Visão Geral

O sistema de temas da aplicação utiliza `next-themes` para gerenciar temas dark/light com suporte ao tema do sistema operacional. A implementação garante persistência entre sessões e navegação sem conflitos.

## Configuração Atual

### ThemeProvider (next-themes)
```typescript
// apps/web/src/app/layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
```

### Configuração de Providers
- **ThemeProvider (next-themes)**: Gerencia estado global do tema
- **CustomThemeProvider**: Gerencia preferências customizadas do usuário
- **Ordem**: next-themes → QueryProvider → AuthProvider → CustomThemeProvider

## Comportamento de Fallback

### Tema 'system'
- **Detecção**: Utiliza `prefers-color-scheme` do CSS
- **Fallback**: Se não detectado, usa `defaultTheme="dark"`
- **Atualização**: Automática quando usuário muda tema do OS

### Prioridade de Temas
1. Tema explicitamente selecionado pelo usuário
2. Tema salvo no localStorage (`theme-preference`)
3. Tema do sistema operacional
4. Tema padrão (`dark`)

## Impacto de SSR/Hydration

### Problemas Comuns
- **Flash of Incorrect Theme (FOIT)**: Tema incorreto durante hidratação
- **Hydration Mismatch**: Diferença entre servidor e cliente

### Soluções Implementadas
```typescript
// Configuração que previne problemas
attribute="class"           // Usa classes CSS em vez de data-attributes
defaultTheme="dark"        // Define tema padrão consistente
disableTransitionOnChange  // Evita animações durante mudança
```

### Componente ThemeToggle
```typescript
// Aguarda montagem para evitar hydration mismatch
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) {
  return <Button variant="ghost" size="sm" disabled />
}
```

## Guia de Troubleshooting

### Problema: Tema não persiste entre sessões
**Causa**: localStorage não está sendo salvo
**Solução**:
1. Verificar se `enableSystem` está configurado
2. Confirmar que não há conflitos com outros providers
3. Limpar localStorage: `localStorage.removeItem('theme')`

### Problema: Flash de tema incorreto
**Causa**: Hydration mismatch
**Solução**:
1. Verificar se `defaultTheme` está definido
2. Confirmar que `disableTransitionOnChange` está ativo
3. Implementar loading state no ThemeToggle

### Problema: Tema não muda no dashboard
**Causa**: ThemeToggle não implementado
**Solução**:
```typescript
// Adicionar ao DashboardHeader
import { ThemeToggle } from '@/components/ui/theme-toggle'

<ThemeToggle variant="button" size="sm" />
```

### Problema: Conflito com CustomThemeProvider
**Causa**: Ordem incorreta de providers
**Solução**:
```typescript
// Ordem correta no layout.tsx
<ThemeProvider> {/* next-themes primeiro */}
  <QueryProvider>
    <AuthProvider>
      <CustomThemeProvider> {/* customizações por último */}
```

## Debugging

### Verificar Estado do Tema
```typescript
// No componente
const { theme, systemTheme, resolvedTheme } = useTheme()
console.log({ theme, systemTheme, resolvedTheme })
```

### Verificar localStorage
```javascript
// No browser console
console.log(localStorage.getItem('theme'))
```

### Verificar CSS Classes
```javascript
// Verificar se classe está aplicada
document.documentElement.classList.contains('dark')
```

## Testes Recomendados

### Teste Manual
1. **Mudança de Tema**: Clicar no ThemeToggle e verificar mudança visual
2. **Persistência**: Recarregar página e confirmar tema mantido
3. **Navegação**: Navegar entre páginas e verificar consistência
4. **Sistema**: Mudar tema do OS e verificar atualização automática

### Teste de Regressão
1. Verificar se não há erros de hydration no console
2. Confirmar que animações não causam flickering
3. Testar em diferentes navegadores e dispositivos

## Arquivos Relacionados

- `apps/web/src/app/layout.tsx` - Configuração principal
- `apps/web/src/components/ui/theme-toggle.tsx` - Componente de mudança
- `apps/web/src/components/providers/theme-provider.tsx` - Provider do next-themes
- `apps/web/src/components/providers/ThemeProvider.tsx` - Provider customizado
- `apps/web/src/components/layouts/DashboardHeader.tsx` - Toggle no dashboard
- `apps/web/src/components/layouts/PublicHeader.tsx` - Toggle no site público

## Considerações de Performance

- **Lazy Loading**: ThemeToggle só renderiza após montagem
- **Transições Desabilitadas**: Evita animações desnecessárias durante mudança
- **CSS Classes**: Mais performático que data-attributes
- **Sistema de Fallback**: Reduz tempo de detecção do tema inicial