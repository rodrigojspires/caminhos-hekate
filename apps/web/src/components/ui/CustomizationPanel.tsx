'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useThemeContext } from '@/components/providers/ThemeProvider'
import { DEFAULT_THEMES, CustomTheme, getThemeService } from '@/lib/theme'
import { toast } from 'sonner'
import {
  Palette,
  Type,
  Layout,
  Accessibility,
  Monitor,
  Sun,
  Moon,
  Contrast,
  Save,
  RotateCcw,
  Download,
  Upload,
  Eye,
  Settings
} from 'lucide-react'

interface CustomizationPanelProps {
  className?: string
}

export function CustomizationPanel({ className }: CustomizationPanelProps) {
  const {
    preferences,
    isLoading,
    updatePreferences,
    applyTheme,
    isDarkMode,
    toggleDarkMode
  } = useThemeContext()

  const [customTheme, setCustomTheme] = useState<Partial<CustomTheme>>({
    name: '',
    colors: preferences.theme?.colors ?? DEFAULT_THEMES.light.colors,
    typography: preferences.theme?.typography ?? DEFAULT_THEMES.light.typography,
    spacing: preferences.theme?.spacing ?? DEFAULT_THEMES.light.spacing
  })

  const [previewMode, setPreviewMode] = useState(false)

  // Atualizar cor
  const updateColor = (colorKey: string, value: string) => {
    if (!/^#[0-9A-F]{6}$/i.test(value)) return

    const newColors = {
      ...(preferences.theme?.colors ?? DEFAULT_THEMES.light.colors),
      [colorKey]: value
    }

    if (previewMode) {
      setCustomTheme(prev => ({
        ...prev,
        colors: newColors
      }))
    } else {
      updatePreferences({
        theme: {
          ...(preferences.theme ?? {}),
          colors: newColors
        }
      })
    }
  }

  // Atualizar tipografia
  const updateTypography = (typographyKey: string, value: string | number) => {
    const newTypography = {
      ...(preferences.theme?.typography ?? DEFAULT_THEMES.light.typography),
      [typographyKey]: value
    }

    if (previewMode) {
      setCustomTheme(prev => ({
        ...prev,
        typography: newTypography
      }))
    } else {
      updatePreferences({
        theme: {
          ...(preferences.theme ?? {}),
          typography: newTypography
        }
      })
    }
  }

  // Atualizar espaçamento
  const updateSpacing = (key: string, value: any) => {
    const newSpacing = {
      ...(preferences.theme?.spacing ?? DEFAULT_THEMES.light.spacing),
      [key]: value
    }

    if (previewMode) {
      setCustomTheme(prev => ({
        ...prev,
        spacing: newSpacing
      }))
    } else {
      updatePreferences({
        theme: {
          ...(preferences.theme ?? {}),
          spacing: newSpacing
        }
      })
    }
  }

  // Atualizar layout
  const updateLayout = (key: string, value: any) => {
    const newLayout = {
      ...(preferences.layout ?? {}),
      [key]: value
    }

    updatePreferences({
      layout: newLayout
    })
  }

  // Atualizar acessibilidade
  const updateAccessibility = (key: string, value: boolean) => {
    const currentAccessibility = preferences.accessibility ?? {
      reduceMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false
    }
    
    const newAccessibility = {
      ...currentAccessibility,
      [key]: value
    }

    updatePreferences({
      accessibility: newAccessibility
    })
  }

  // Salvar tema customizado
  const saveCustomTheme = async () => {
    if (!customTheme.name || !customTheme.colors) {
      toast.error('Nome e cores são obrigatórios')
      return
    }

    try {
      const themeService = getThemeService()
      await themeService.createCustomTheme('user-id', customTheme as CustomTheme)
      toast.success('Tema salvo com sucesso')
    } catch (error) {
      toast.error('Erro ao salvar tema')
    }
  }

  // Resetar para padrão
  const resetToDefault = () => {
    updatePreferences({
      theme: {
        colors: DEFAULT_THEMES.light.colors,
        typography: DEFAULT_THEMES.light.typography,
        spacing: DEFAULT_THEMES.light.spacing,
        mode: 'light'
      },
      layout: {
        sidebar: { width: 280, collapsed: false },
        header: { height: 64, fixed: true },
        maxWidth: 'xl'
      },
      accessibility: {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        screenReader: false
      }
    })
    toast.success('Configurações resetadas')
  }

  // Exportar configurações
  const exportSettings = () => {
    const data = JSON.stringify(preferences, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'theme-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Importar configurações
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        updatePreferences(settings)
        toast.success('Configurações importadas')
      } catch (error) {
        toast.error('Arquivo inválido')
      }
    }
    reader.readAsText(file)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personalização de UI
            </CardTitle>
            <CardDescription>
              Customize a aparência e comportamento da interface
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportSettings}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={importSettings}
            />
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Tema
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Tipografia
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Accessibility className="h-4 w-4" />
              Acessibilidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-6">
            {/* Modo de Tema */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Modo do Tema</Label>
              <div className="flex gap-2">
                <Button
                  variant={preferences.theme?.mode === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyTheme('light')}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Claro
                </Button>
                <Button
                  variant={preferences.theme?.mode === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyTheme('dark')}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Escuro
                </Button>
                <Button
                  variant={preferences.theme?.mode === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updatePreferences({ theme: { ...preferences.theme, mode: 'auto' } })}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Auto
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyTheme('highContrast')}
                >
                  <Contrast className="h-4 w-4 mr-2" />
                  Alto Contraste
                </Button>
              </div>
            </div>

            <Separator />

            {/* Cores Personalizadas */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Cores Personalizadas</Label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(preferences.theme?.colors || DEFAULT_THEMES.light.colors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={value}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="w-12 h-8 p-1 border rounded"
                      />
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="flex-1 font-mono text-sm"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Salvar Tema Customizado */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Salvar Tema Customizado</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do tema"
                  value={customTheme.name}
                  onChange={(e) => setCustomTheme(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1"
                />
                <Button onClick={saveCustomTheme}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Configurações de Tipografia</Label>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Família da Fonte</Label>
                  <Select
                    value={preferences.theme?.typography?.fontFamily || 'Inter, sans-serif'}
                    onValueChange={(value) => updateTypography('fontFamily', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                      <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                      <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                      <SelectItem value="Poppins, sans-serif">Poppins</SelectItem>
                      <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tamanho da Fonte</Label>
                  <Select
                    value={preferences.theme?.typography?.fontSize || 'medium'}
                    onValueChange={(value) => updateTypography('fontSize', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeno (14px)</SelectItem>
                      <SelectItem value="medium">Médio (16px)</SelectItem>
                      <SelectItem value="large">Grande (18px)</SelectItem>
                      <SelectItem value="extra-large">Extra Grande (20px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Altura da Linha: {preferences.theme?.typography?.lineHeight || 1.5}</Label>
                  <Slider
                    value={[preferences.theme?.typography?.lineHeight || 1.5]}
                    onValueChange={([value]) => updateTypography('lineHeight', value)}
                    min={1}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Configurações de Layout</Label>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Densidade do Espaçamento</Label>
                  <Select
                    value={preferences.theme?.spacing?.density || 'comfortable'}
                    onValueChange={(value) => updateSpacing('density', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compacto</SelectItem>
                      <SelectItem value="comfortable">Confortável</SelectItem>
                      <SelectItem value="spacious">Espaçoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Raio da Borda</Label>
                  <Select
                    value={preferences.theme?.spacing?.borderRadius || 'medium'}
                    onValueChange={(value) => updateSpacing('borderRadius', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="small">Pequeno</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                      <SelectItem value="full">Completo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Largura da Sidebar: {preferences.layout?.sidebar?.width || 280}px</Label>
                  <Slider
                    value={[preferences.layout?.sidebar?.width || 280]}
                    onValueChange={([value]) => updateLayout('sidebar', { ...preferences.layout?.sidebar, width: value })}
                    min={200}
                    max={400}
                    step={10}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Altura do Header: {preferences.layout?.header?.height || 64}px</Label>
                  <Slider
                    value={[preferences.layout?.header?.height || 64]}
                    onValueChange={([value]) => updateLayout('header', { ...preferences.layout?.header, height: value })}
                    min={48}
                    max={80}
                    step={4}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Largura Máxima do Conteúdo</Label>
                  <Select
                    value={preferences.layout?.maxWidth || 'xl'}
                    onValueChange={(value) => updateLayout('maxWidth', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Pequeno (640px)</SelectItem>
                      <SelectItem value="md">Médio (768px)</SelectItem>
                      <SelectItem value="lg">Grande (1024px)</SelectItem>
                      <SelectItem value="xl">Extra Grande (1280px)</SelectItem>
                      <SelectItem value="2xl">2X Grande (1536px)</SelectItem>
                      <SelectItem value="full">Completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Configurações de Acessibilidade</Label>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reduzir Movimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduz animações e transições
                    </p>
                  </div>
                  <Switch
                    checked={preferences.accessibility?.reduceMotion || false}
                    onCheckedChange={(checked) => updateAccessibility('reduceMotion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alto Contraste</Label>
                    <p className="text-sm text-muted-foreground">
                      Aumenta o contraste das cores
                    </p>
                  </div>
                  <Switch
                    checked={preferences.accessibility?.highContrast || false}
                    onCheckedChange={(checked) => updateAccessibility('highContrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Texto Grande</Label>
                    <p className="text-sm text-muted-foreground">
                      Aumenta o tamanho do texto
                    </p>
                  </div>
                  <Switch
                    checked={preferences.accessibility?.largeText || false}
                    onCheckedChange={(checked) => updateAccessibility('largeText', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Leitor de Tela</Label>
                    <p className="text-sm text-muted-foreground">
                      Otimizações para leitores de tela
                    </p>
                  </div>
                  <Switch
                    checked={preferences.accessibility?.screenReader || false}
                    onCheckedChange={(checked) => updateAccessibility('screenReader', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default CustomizationPanel