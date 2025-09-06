'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, DialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useThemeContext } from '@/components/providers/ThemeProvider'
import { CustomTheme, getThemeService, DEFAULT_THEMES } from '@/lib/theme'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
  Palette,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Share,
  Download,
  Star,
  StarOff,
  Globe,
  Lock
} from 'lucide-react'

interface ThemeCustomizationProps {
  className?: string
}

interface CustomThemeWithId extends CustomTheme {
  id: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export function ThemeCustomization({ className }: ThemeCustomizationProps) {
  const { user } = useAuth()
  const { preferences, updatePreferences } = useThemeContext()
  const [customThemes, setCustomThemes] = useState<CustomThemeWithId[]>([])
  const [publicThemes, setPublicThemes] = useState<CustomTheme[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTheme, setSelectedTheme] = useState<CustomThemeWithId | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newTheme, setNewTheme] = useState<Partial<CustomTheme>>({
    name: '',
    colors: DEFAULT_THEMES.light.colors,
    typography: DEFAULT_THEMES.light.typography,
    spacing: DEFAULT_THEMES.light.spacing,
    isPublic: false
  })

  // Carregar temas
  const loadThemes = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const themeService = getThemeService()
      
      // Carregar temas públicos
      const publicThemesData = await themeService.getPublicThemes()
      setPublicThemes(publicThemesData)
      
      // Aqui você carregaria os temas do usuário do banco de dados
      // Por enquanto, vamos usar um array vazio
      setCustomThemes([])
    } catch (error) {
      console.error('Erro ao carregar temas:', error)
      toast.error('Erro ao carregar temas')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadThemes()
  }, [loadThemes])

  // Aplicar tema
  const applyTheme = async (theme: CustomTheme) => {
    try {
      await updatePreferences({
        theme: {
          colors: theme.colors,
          typography: theme.typography || preferences.theme?.typography,
          spacing: theme.spacing || preferences.theme?.spacing,
          mode: preferences.theme?.mode || 'light'
        }
      })
      toast.success(`Tema "${theme.name}" aplicado com sucesso`)
    } catch (error) {
      toast.error('Erro ao aplicar tema')
    }
  }

  // Criar tema
  const createTheme = async () => {
    if (!user?.id || !newTheme.name || !newTheme.colors) {
      toast.error('Nome e cores são obrigatórios')
      return
    }

    try {
      const themeService = getThemeService()
      await themeService.createCustomTheme(user.id, newTheme as CustomTheme)
      
      toast.success('Tema criado com sucesso')
      setIsCreateDialogOpen(false)
      setNewTheme({
        name: '',
        colors: DEFAULT_THEMES.light.colors,
        typography: DEFAULT_THEMES.light.typography,
        spacing: DEFAULT_THEMES.light.spacing,
        isPublic: false
      })
      loadThemes()
    } catch (error) {
      toast.error('Erro ao criar tema')
    }
  }

  // Duplicar tema
  const duplicateTheme = (theme: CustomTheme) => {
    setNewTheme({
      name: `${theme.name} (Cópia)`,
      colors: { ...theme.colors },
      typography: theme.typography ? { ...theme.typography } : undefined,
      spacing: theme.spacing ? { ...theme.spacing } : undefined,
      isPublic: false
    })
    setIsCreateDialogOpen(true)
  }

  // Exportar tema
  const exportTheme = (theme: CustomTheme) => {
    const data = JSON.stringify(theme, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Tema exportado com sucesso')
  }

  // Pré-visualizar tema
  const previewTheme = (theme: CustomTheme) => {
    // Implementar pré-visualização temporária
    toast.info('Pré-visualização em desenvolvimento')
  }

  // Renderizar cartão de tema
  const renderThemeCard = (theme: CustomTheme, isCustom = false, themeId?: string) => (
    <Card key={themeId || theme.name} className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{theme.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {theme.isPublic && (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Público
                </Badge>
              )}
              {isCustom && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Meu Tema
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => previewTheme(theme)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicateTheme(theme)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportTheme(theme)}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Paleta de cores */}
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1">
            {Object.entries(theme.colors).slice(0, 5).map(([key, color]) => (
              <div
                key={key}
                className="h-8 rounded border"
                style={{ backgroundColor: color }}
                title={`${key}: ${color}`}
              />
            ))}
          </div>
          
          {/* Informações do tema */}
          <div className="text-xs text-muted-foreground space-y-1">
            {theme.typography && (
              <div>Fonte: {theme.typography.fontFamily}</div>
            )}
            {theme.spacing && (
              <div>Densidade: {theme.spacing.density}</div>
            )}
          </div>
          
          {/* Ações */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => applyTheme(theme)}
              className="flex-1"
            >
              Aplicar Tema
            </Button>
            {isCustom && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="px-3">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Tema</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o tema &#34;{theme.name}&#34;? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => toast.info('Exclusão em desenvolvimento')}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Temas Personalizados</h2>
          <p className="text-muted-foreground">
            Crie, gerencie e aplique temas personalizados
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Tema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Tema</DialogTitle>
              <DialogDescription>
                Personalize as cores, tipografia e espaçamento do seu tema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Tema</Label>
                <Input
                  value={newTheme.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTheme((prev: Partial<CustomTheme>) => ({ ...prev, name: e.target.value }))}
                  placeholder="Meu Tema Personalizado"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cores Principais</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(newTheme.colors || DEFAULT_THEMES.light.colors).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTheme((prev: Partial<CustomTheme>) => ({
                            ...prev,
                            colors: {
                              ...prev.colors!,
                              [key]: e.target.value
                            }
                          }))}
                          className="w-12 h-8 p-1 border rounded"
                        />
                        <Input
                          type="text"
                          value={value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTheme((prev: Partial<CustomTheme>) => ({
                            ...prev,
                            colors: {
                              ...prev.colors!,
                              [key]: e.target.value
                            }
                          }))}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createTheme}>
                Criar Tema
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Temas Padrão */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Temas Padrão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(DEFAULT_THEMES).map(([key, theme]) =>
            renderThemeCard(theme, false, key)
          )}
        </div>
      </div>

      {/* Meus Temas */}
      {customThemes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Meus Temas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customThemes.map((theme) =>
              renderThemeCard(theme, true, theme.id)
            )}
          </div>
        </div>
      )}

      {/* Temas Públicos */}
      {publicThemes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Temas da Comunidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicThemes.map((theme) =>
              renderThemeCard(theme, false, theme.name)
            )}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {customThemes.length === 0 && publicThemes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum tema personalizado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro tema personalizado para começar
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Tema
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ThemeCustomization