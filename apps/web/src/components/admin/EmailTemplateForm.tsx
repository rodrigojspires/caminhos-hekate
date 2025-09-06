'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Save, 
  Eye,
  Code,
  AlertTriangle,
  Info,
  Mail,
  FileText,
  Braces
} from 'lucide-react'
import { toast } from 'sonner'

interface EmailTemplate {
  id?: string
  name: string
  subject: string
  htmlContent: string
  textContent?: string
  type: 'system' | 'custom'
  category: 'auth' | 'notification' | 'marketing' | 'transactional'
  variables: string[]
  isActive: boolean
}

interface EmailTemplateFormProps {
  template?: EmailTemplate
  onSave?: (template: Omit<EmailTemplate, 'id'>) => void
  onCancel?: () => void
}

const TEMPLATE_CATEGORIES = [
  { value: 'auth', label: 'Autenticação' },
  { value: 'notification', label: 'Notificação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transacional' }
]

const COMMON_VARIABLES = [
  '{{user.name}}',
  '{{user.email}}',
  '{{site.name}}',
  '{{site.url}}',
  '{{date}}',
  '{{time}}',
  '{{verification.url}}',
  '{{reset.url}}',
  '{{order.id}}',
  '{{order.total}}',
  '{{course.name}}',
  '{{course.url}}'
]

function extractVariables(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  
  while ((match = regex.exec(content)) !== null) {
    matches.push(`{{${match[1]}}}`)
  }
  
  return [...new Set(matches)]
}

function validateTemplate(template: Partial<EmailTemplate>): string[] {
  const errors: string[] = []
  
  if (!template.name?.trim()) {
    errors.push('Nome é obrigatório')
  }
  
  if (!template.subject?.trim()) {
    errors.push('Assunto é obrigatório')
  }
  
  if (!template.htmlContent?.trim()) {
    errors.push('Conteúdo HTML é obrigatório')
  }
  
  if (!template.category) {
    errors.push('Categoria é obrigatória')
  }
  
  // Check for unmatched variables between subject and content
  const subjectVars = extractVariables(template.subject || '')
  const contentVars = extractVariables(template.htmlContent || '')
  const textVars = extractVariables(template.textContent || '')
  
  const allVars = [...new Set([...subjectVars, ...contentVars, ...textVars])]
  
  if (allVars.length === 0) {
    errors.push('Template deve conter pelo menos uma variável')
  }
  
  return errors
}

export function EmailTemplateForm({ template, onSave, onCancel }: EmailTemplateFormProps) {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    name: template?.name || '',
    subject: template?.subject || '',
    htmlContent: template?.htmlContent || '',
    textContent: template?.textContent || '',
    type: template?.type || 'custom',
    category: template?.category || 'notification',
    variables: template?.variables || [],
    isActive: template?.isActive ?? true
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html')

  const handleInputChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([])
    }
    
    // Auto-extract variables from content
    if (field === 'subject' || field === 'htmlContent' || field === 'textContent') {
      const subjectVars = extractVariables(field === 'subject' ? value : formData.subject || '')
      const contentVars = extractVariables(field === 'htmlContent' ? value : formData.htmlContent || '')
      const textVars = extractVariables(field === 'textContent' ? value : formData.textContent || '')
      
      const allVars = [...new Set([...subjectVars, ...contentVars, ...textVars])]
      setFormData(prev => ({ ...prev, variables: allVars }))
    }
  }

  const insertVariable = (variable: string, field: 'subject' | 'htmlContent' | 'textContent') => {
    const currentValue = formData[field] || ''
    const newValue = currentValue + variable
    handleInputChange(field, newValue)
  }

  const handleSave = async () => {
    const validationErrors = validateTemplate(formData)
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      toast.error('Corrija os erros antes de salvar')
      return
    }
    
    setIsSaving(true)
    
    try {
      if (onSave) {
        await onSave(formData as Omit<EmailTemplate, 'id'>)
      }
      
      toast.success('Template salvo com sucesso')
    } catch (error) {
      toast.error('Erro ao salvar template')
    } finally {
      setIsSaving(false)
    }
  }

  const generatePreview = () => {
    let content = previewMode === 'html' ? formData.htmlContent : formData.textContent
    
    if (!content) return 'Nenhum conteúdo para preview'
    
    // Replace variables with sample data
    const sampleData: Record<string, string> = {
      '{{user.name}}': 'João Silva',
      '{{user.email}}': 'joao@exemplo.com',
      '{{site.name}}': 'Caminhos de Hekate',
      '{{site.url}}': 'https://caminhosdehekate.com',
      '{{date}}': new Date().toLocaleDateString('pt-BR'),
      '{{time}}': new Date().toLocaleTimeString('pt-BR'),
      '{{verification.url}}': 'https://exemplo.com/verificar/abc123',
      '{{reset.url}}': 'https://exemplo.com/redefinir/xyz789',
      '{{order.id}}': '#12345',
      '{{order.total}}': 'R$ 299,90',
      '{{course.name}}': 'Curso de Tarot Avançado',
      '{{course.url}}': 'https://exemplo.com/cursos/tarot-avancado'
    }
    
    Object.entries(sampleData).forEach(([variable, value]) => {
      content = content?.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value)
    })
    
    return content
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
            {template ? 'Edite as informações do template de e-mail' : 'Crie um novo template de e-mail'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {formData.type === 'system' && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              <FileText className="mr-1 h-3 w-3" />
              Sistema
            </Badge>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Corrija os seguintes erros:</h4>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Boas-vindas ao usuário"
                  disabled={formData.type === 'system'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                  disabled={formData.type === 'system'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto *</Label>
                <div className="space-y-2">
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Ex: Bem-vindo(a) ao {{site.name}}, {{user.name}}!"
                  />
                  <div className="flex flex-wrap gap-1">
                    {COMMON_VARIABLES.slice(0, 4).map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => insertVariable(variable, 'subject')}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Conteúdo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="html" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="text">Texto</TabsTrigger>
                </TabsList>
                
                <TabsContent value="html" className="space-y-2">
                  <Label htmlFor="htmlContent">Conteúdo HTML *</Label>
                  <Textarea
                    id="htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                    placeholder="<h1>Olá {{user.name}}!</h1><p>Bem-vindo ao {{site.name}}...</p>"
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-1">
                    {COMMON_VARIABLES.map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => insertVariable(variable, 'htmlContent')}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="textContent">Conteúdo em Texto (Opcional)</Label>
                  <Textarea
                    id="textContent"
                    value={formData.textContent}
                    onChange={(e) => handleInputChange('textContent', e.target.value)}
                    placeholder="Olá {{user.name}}! Bem-vindo ao {{site.name}}..."
                    rows={12}
                  />
                  <div className="flex flex-wrap gap-1">
                    {COMMON_VARIABLES.map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => insertVariable(variable, 'textContent')}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Variables */}
          {formData.variables && formData.variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Braces className="h-5 w-5" />
                  Variáveis Detectadas
                </CardTitle>
                <CardDescription>
                  Variáveis encontradas no template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formData.variables.map((variable) => (
                    <Badge key={variable} variant="outline">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={previewMode === 'html' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('html')}
                  >
                    HTML
                  </Button>
                  <Button
                    variant={previewMode === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('text')}
                  >
                    Texto
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Assunto:</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formData.subject?.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
                      const sampleData: Record<string, string> = {
                        'user.name': 'João Silva',
                        'site.name': 'Caminhos de Hekate'
                      }
                      return sampleData[variable] || match
                    }) || 'Sem assunto'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm font-medium">Conteúdo:</Label>
                  <div className="border rounded p-4 bg-white min-h-[300px] max-h-[500px] overflow-auto">
                    {previewMode === 'html' ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: generatePreview() || '' }}
                        className="prose prose-sm max-w-none"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">
                        {generatePreview()}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar Template'}
        </Button>
      </div>
    </div>
  )
}