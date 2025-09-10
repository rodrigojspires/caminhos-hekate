'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, X, Save, Trash2 } from 'lucide-react'
import { usePreviewData } from '@/hooks/useSystemSettings'
import { DynamicEmailPreview } from './DynamicEmailPreview'
import { EmailTemplateSelector } from './EmailTemplateSelector'
// Remover import não utilizado
// Remover este import de templates pois não é mais utilizado
// import { getAllPredefinedTemplates, convertToEmailTemplate, type PredefinedTemplate } from '@/lib/email-templates'

interface EmailTemplate {
  id?: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  tags: string[]
  variables: string[]
  isActive: boolean
}

interface EmailTemplateManagerProps {
  template?: EmailTemplate
  onSave?: (template: EmailTemplate) => void
  onDelete?: (templateId: string) => void
}

export function EmailTemplateManager({ 
  template, 
  onSave, 
  onDelete 
}: EmailTemplateManagerProps) {
  const { sampleData, getAllVariablesByCategory } = usePreviewData()
  const [formData, setFormData] = useState<EmailTemplate>({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    tags: [],
    variables: [],
    isActive: true,
    ...template
  })
  const [newTag, setNewTag] = useState('')
  const [activeTab, setActiveTab] = useState('editor')
  // Remover estado não utilizado de templates predefinidos
  // const [predefinedTemplates] = useState<PredefinedTemplate[]>(getAllPredefinedTemplates())

  // Detectar variáveis automaticamente
  useEffect(() => {
    const detectVariables = () => {
      const allContent = `${formData.subject} ${formData.htmlContent} ${formData.textContent}`
      const variableRegex = /\{\{([^}]+)\}\}/g
      const matches = [...allContent.matchAll(variableRegex)]
      const detectedVars = [...new Set(matches.map(match => match[1]))]
      
      setFormData(prev => ({
        ...prev,
        variables: detectedVars
      }))
    }

    detectVariables()
  }, [formData.subject, formData.htmlContent, formData.textContent])

  const handleInputChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Remover função não utilizada de aplicação de template predefinido
  // const handleApplyPredefinedTemplate = (predefinedTemplate: PredefinedTemplate) => {
  //   const emailTemplate = convertToEmailTemplate(predefinedTemplate)
  //   setFormData(prev => ({
  //     ...prev,
  //     ...emailTemplate,
  //     id: prev.id // Manter ID se existir
  //   }))
  // }

  const handleSave = () => {
    if (onSave) {
      onSave(formData)
    }
  }

  const handleDelete = () => {
    if (onDelete && formData.id) {
      onDelete(formData.id)
    }
  }

  const insertVariable = (variable: string) => {
    const variableTag = `{{${variable}}}`
    // Inserir no campo HTML ativo (simulação)
    setFormData(prev => ({
      ...prev,
      htmlContent: prev.htmlContent + variableTag
    }))
  }

  const categorizedVariables = getAllVariablesByCategory()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {template?.id ? 'Editar Template' : 'Novo Template'}
          </h2>
          <p className="text-muted-foreground">
            Crie e gerencie templates de email dinâmicos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {template?.id && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Template
          </Button>
        </div>
      </div>

      {/* Seletor de Templates Predefinidos */}
      <EmailTemplateSelector
        onTemplateSelect={(tpl) => {
          setFormData(prev => ({
            ...prev,
            name: tpl.name,
            subject: tpl.subject,
            htmlContent: tpl.htmlContent,
            textContent: tpl.textContent || '',
            variables: Array.isArray(tpl.variables) ? tpl.variables : prev.variables,
            id: prev.id
          }))
        }}
      />

      <Separator />

      {/* Tabs Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="variables">Variáveis</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Tab Editor */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Template</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Boas-vindas, Recuperação de senha..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Ex: Bem-vindo {{user.name}}!"
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Adicionar tag"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button type="button" size="sm" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo HTML</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.htmlContent}
                    onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                    placeholder="Conteúdo HTML do email..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo em Texto</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.textContent}
                    onChange={(e) => handleInputChange('textContent', e.target.value)}
                    placeholder="Versão em texto simples..."
                    className="min-h-[150px]"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Variáveis Disponíveis */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Variáveis Detectadas</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Variáveis encontradas automaticamente no seu template
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {formData.variables.length > 0 ? (
                      formData.variables.map((variable) => (
                        <Badge key={variable} variant="default" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma variável detectada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Clique para inserir no template
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(categorizedVariables).map(([category, variables]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {variables.map((variable) => (
                            <Button
                              key={variable.key}
                              variant="ghost"
                              size="sm"
                              className="justify-start h-auto p-2 text-xs"
                              onClick={() => insertVariable(variable.key)}
                            >
                              <div className="text-left">
                                <div className="font-mono">{`{{${variable.key}}}`}</div>
                                <div className="text-muted-foreground">{variable.label}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab Variáveis */}
        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Variáveis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie todas as variáveis disponíveis no sistema
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categorizedVariables).map(([category, variables]) => (
                  <div key={category}>
                    <h3 className="font-medium mb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {variables.map((variable) => (
                        <Card key={variable.key} className="p-3">
                          <div className="space-y-1">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {`{{${variable.key}}}`}
                            </code>
                            <p className="text-xs text-muted-foreground">{variable.label}</p>
                            <p className="text-xs font-mono text-green-600">
                              Exemplo: {String(sampleData[variable.key] || 'N/A')}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Preview */}
        <TabsContent value="preview">
          <DynamicEmailPreview
            subject={formData.subject}
            htmlContent={formData.htmlContent}
            textContent={formData.textContent}
            variables={formData.variables}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}