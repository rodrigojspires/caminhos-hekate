'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Eye, Save, Send, Code, Palette, Settings, Plus, X, Copy } from 'lucide-react'
import type { EmailTemplate, EmailTemplateStatus, EmailCategory } from '@/lib/email'

interface EmailTemplateEditorProps {
  template?: EmailTemplate
  onSave?: (template: EmailTemplate | Partial<EmailTemplate>) => void
  onCancel?: () => void
  onPreview?: (template: Partial<EmailTemplate>) => void
  onSend?: (template: Partial<EmailTemplate>) => void
  isLoading?: boolean
}

interface Variable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean'
  defaultValue?: string
  description?: string
}

export function EmailTemplateEditor({
  template,
  onSave,
  onPreview,
  onSend,
  isLoading = false
}: EmailTemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    slug: template?.slug || '',
    description: template?.description || '',
    category: template?.category || 'TRANSACTIONAL' as EmailCategory,
    subject: template?.subject || '',
    htmlContent: template?.htmlContent || '',
    textContent: template?.textContent || '',
    status: template?.status || 'DRAFT' as EmailTemplateStatus,
    isActive: template?.isActive ?? true,
    tags: template?.tags || []
  })

  const [variables, setVariables] = useState<Variable[]>([])
  const [newTag, setNewTag] = useState('')
  const [activeTab, setActiveTab] = useState('content')
  const [previewData, setPreviewData] = useState<Record<string, any>>({})

  // Extrair variáveis do conteúdo
  useEffect(() => {
    const extractVariables = () => {
      const content = formData.htmlContent + ' ' + formData.subject + ' ' + formData.textContent
      const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
      const foundVariables = new Set<string>()
      let match

      while ((match = variableRegex.exec(content)) !== null) {
        foundVariables.add(match[1])
      }

      const newVariables = Array.from(foundVariables).map(name => {
        const existing = variables.find(v => v.name === name)
        return existing || {
          name,
          type: 'text' as const,
          defaultValue: '',
          description: ''
        }
      })

      setVariables(newVariables)
    }

    extractVariables()
  }, [formData.htmlContent, formData.subject, formData.textContent, variables])

  // Gerar slug automaticamente
  useEffect(() => {
    if (formData.name && !template?.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.name, template?.slug])

  const handleInputChange = (field: string, value: any) => {
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

  const handleVariableChange = (index: number, field: keyof Variable, value: string) => {
    setVariables(prev => prev.map((variable, i) => 
      i === index ? { ...variable, [field]: value } : variable
    ))
  }

  const handlePreviewDataChange = (variableName: string, value: string) => {
    setPreviewData(prev => ({ ...prev, [variableName]: value }))
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do template é obrigatório')
      return
    }

    if (!formData.subject.trim()) {
      toast.error('Assunto é obrigatório')
      return
    }

    if (!formData.htmlContent.trim()) {
      toast.error('Conteúdo HTML é obrigatório')
      return
    }

    onSave?.(formData)
  }

  const handlePreview = () => {
    onPreview?.({ ...formData, variables: previewData })
  }

  const handleSendTest = () => {
    onSend?.({ ...formData, variables: previewData })
  }

  const insertVariable = (variableName: string) => {
    const variable = `{{${variableName}}}`
    // Inserir no cursor do textarea ativo
    const activeElement = document.activeElement as HTMLTextAreaElement
    if (activeElement && (activeElement.name === 'htmlContent' || activeElement.name === 'textContent' || activeElement.name === 'subject')) {
      const start = activeElement.selectionStart
      const end = activeElement.selectionEnd
      const currentValue = activeElement.value
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end)
      
      handleInputChange(activeElement.name, newValue)
      
      // Reposicionar cursor
      setTimeout(() => {
        activeElement.focus()
        activeElement.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {template ? 'Editar Template' : 'Novo Template'}
          </h2>
          <p className="text-muted-foreground">
            {template ? 'Modifique as configurações do template' : 'Crie um novo template de email'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={handleSendTest}
            disabled={isLoading}
          >
            <Send className="h-4 w-4 mr-2" />
            Teste
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Variáveis
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Aba Conteúdo */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo do Email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Digite o assunto do email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="htmlContent">Conteúdo HTML</Label>
                    <Textarea
                      id="htmlContent"
                      name="htmlContent"
                      value={formData.htmlContent}
                      onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                      placeholder="Digite o conteúdo HTML do email"
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="textContent">Conteúdo Texto (Opcional)</Label>
                    <Textarea
                      id="textContent"
                      name="textContent"
                      value={formData.textContent}
                      onChange={(e) => handleInputChange('textContent', e.target.value)}
                      placeholder="Digite a versão em texto do email"
                      className="min-h-[150px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Variáveis */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Variáveis Disponíveis</CardTitle>
                </CardHeader>
                <CardContent>
                  {variables.length > 0 ? (
                    <div className="space-y-2">
                      {variables.map((variable, index) => (
                        <div key={variable.name} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-mono text-sm">{variable.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertVariable(variable.name)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Use &#123;&#123;variavel&#125;&#125; no conteúdo para criar variáveis
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Aba Design */}
        <TabsContent value="design" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Design</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidades de design serão implementadas em versões futuras.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Variáveis */}
        <TabsContent value="variables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Variáveis</CardTitle>
            </CardHeader>
            <CardContent>
              {variables.length > 0 ? (
                <div className="space-y-4">
                  {variables.map((variable, index) => (
                    <div key={variable.name} className="p-4 border rounded space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium font-mono">{variable.name}</h4>
                        <Badge variant="outline">{variable.type}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Tipo</Label>
                          <Select
                            value={variable.type}
                            onValueChange={(value) => handleVariableChange(index, 'type', value as Variable['type'])}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="boolean">Booleano</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Valor Padrão</Label>
                          <Input
                            value={variable.defaultValue || ''}
                            onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                            placeholder="Valor padrão"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Descrição</Label>
                        <Input
                          value={variable.description || ''}
                          onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                          placeholder="Descrição da variável"
                        />
                      </div>
                      
                      <div>
                        <Label>Valor para Preview</Label>
                        <Input
                          value={previewData[variable.name] || ''}
                          onChange={(e) => handlePreviewDataChange(variable.name, e.target.value)}
                          placeholder="Valor para preview"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Nenhuma variável encontrada. Use &#123;&#123;nome_da_variavel&#125;&#125; no conteúdo.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Configurações */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Template</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Nome do template"
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="slug-do-template"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição do template"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRANSACTIONAL">Transacional</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="NOTIFICATION">Notificação</SelectItem>
                      <SelectItem value="SYSTEM">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Rascunho</SelectItem>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="ARCHIVED">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Template ativo</Label>
              </div>

              <Separator />

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Nova tag"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}