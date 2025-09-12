'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CustomizationPanel } from '@/components/ui/CustomizationPanel'
import { ThemeCustomization } from '@/components/ui/ThemeCustomization'
import { useThemeContext } from '@/components/providers/ThemeProvider'
import { 
  Palette, 
  Layout, 
  Type, 
  Accessibility, 
  Settings,
  Sparkles,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

export default function CustomizationPage() {
  const { preferences, isLoading, updatePreferences, generateCSS } = useThemeContext()
  const [activeTab, setActiveTab] = useState('appearance')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [nowString, setNowString] = useState<string>('—')

  useEffect(() => {
    const updateNow = () => setNowString(new Date().toLocaleString('pt-BR'))
    updateNow()
    const id = setInterval(updateNow, 60000)
    return () => clearInterval(id)
  }, [])

  // Exportar configurações
  const handleExportSettings = async () => {
    try {
      setIsExporting(true)
      
      const exportData = {
        preferences,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `theme-settings-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Configurações exportadas com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar configurações:', error)
      toast.error('Erro ao exportar configurações')
    } finally {
      setIsExporting(false)
    }
  }

  // Importar configurações
  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      try {
        setIsImporting(true)
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const text = await file.text()
        const importData = JSON.parse(text)

        if (importData.preferences) {
          await updatePreferences(importData.preferences)
          toast.success('Configurações importadas com sucesso!')
        } else {
          toast.error('Arquivo de configuração inválido')
        }
      } catch (error) {
        console.error('Erro ao importar configurações:', error)
        toast.error('Erro ao importar configurações')
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  // Resetar para padrão
  const handleResetToDefault = async () => {
    try {
      const defaultPreferences = {
        theme: {
          colors: undefined,
          typography: undefined,
          spacing: undefined,
          mode: 'light' as const
        },
        layout: {
          sidebar: { width: 280, collapsed: false },
          header: { height: 64, fixed: true },
          maxWidth: 'xl' as const
        },
        accessibility: {
          reduceMotion: false,
          highContrast: false,
          largeText: false,
          screenReader: false
        },
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo'
      }

      await updatePreferences(defaultPreferences)
      toast.success('Configurações resetadas para o padrão!')
    } catch (error) {
      console.error('Erro ao resetar configurações:', error)
      toast.error('Erro ao resetar configurações')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personalização</h1>
          <p className="text-muted-foreground mt-2">
            Customize a aparência e comportamento da interface
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSettings}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportSettings}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importando...' : 'Importar'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Tema Atual</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {preferences?.theme?.mode || 'Claro'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Layout</p>
                <p className="text-xs text-muted-foreground">
                  {preferences?.layout?.maxWidth || 'XL'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Tipografia</p>
                <p className="text-xs text-muted-foreground">
                  {preferences?.theme?.typography?.fontFamily || 'Padrão'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Acessibilidade</p>
                <div className="flex gap-1 mt-1">
                  {preferences?.accessibility?.highContrast && (
                    <Badge variant="secondary" className="text-xs">Alto Contraste</Badge>
                  )}
                  {preferences?.accessibility?.largeText && (
                    <Badge variant="secondary" className="text-xs">Texto Grande</Badge>
                  )}
                  {!preferences?.accessibility?.highContrast && !preferences?.accessibility?.largeText && (
                    <span className="text-xs text-muted-foreground">Padrão</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Temas
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Avançado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Aparência</CardTitle>
              <CardDescription>
                Personalize cores, tipografia, layout e acessibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomizationPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Temas</CardTitle>
              <CardDescription>
                Crie, edite e gerencie seus temas personalizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeCustomization />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
              <CardDescription>
                Configurações técnicas e de desenvolvimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">CSS Gerado</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
                    <code>{generateCSS()}</code>
                  </pre>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium mb-3">Informações do Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Localidade:</span>
                    <span className="ml-2">{preferences?.locale || 'pt-BR'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fuso Horário:</span>
                    <span className="ml-2">{preferences?.timezone || 'America/Sao_Paulo'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última Atualização:</span>
-                    <span className="ml-2">{new Date().toLocaleString('pt-BR')}</span>
+                    <span className="ml-2">{nowString}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}