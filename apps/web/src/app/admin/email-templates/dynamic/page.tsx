'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { File, Plus, Settings, Eye, Mail } from 'lucide-react'
import { EmailTemplateManager } from '@/components/email/EmailTemplateManager'
import { DynamicEmailPreview } from '@/components/email/DynamicEmailPreview'
import { EmailTemplateSelector } from '@/components/email/EmailTemplateSelector'
import { getAllPredefinedTemplates, type PredefinedTemplate } from '@/lib/email-templates'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  tags: string[]
  variables: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export default function DynamicEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/admin/email-templates/dynamic');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error('Error fetching dynamic email templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
        <p className="text-muted-foreground mb-4">
          Não há templates de email dinâmicos cadastrados.
        </p>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Primeiro Template
        </Button>
      </div>
    );
  }
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | undefined>()
  const [activeTab, setActiveTab] = useState('list')
  const [predefinedTemplates] = useState<PredefinedTemplate[]>(getAllPredefinedTemplates())

  // Tipo compatível com EmailTemplateManager (sem campos createdAt/updatedAt)
  type EditableEmailTemplate = {
    id?: string
    name: string
    subject: string
    htmlContent: string
    textContent: string
    tags: string[]
    variables: string[]
    isActive: boolean
  }

  const handleSaveTemplate = (template: EditableEmailTemplate) => {
    if (template.id) {
      // Atualizar template existente
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, ...template, updatedAt: new Date() }
          : t
      ))
    } else {
      // Criar novo template
      const newTemplate: EmailTemplate = {
        ...template,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setTemplates(prev => [...prev, newTemplate])
    }
    setActiveTab('list')
    setSelectedTemplate(undefined)
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    setActiveTab('list')
    setSelectedTemplate(undefined)
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setActiveTab('editor')
  }

  const handleNewTemplate = () => {
    setSelectedTemplate(undefined)
    setActiveTab('editor')
  }

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setActiveTab('preview')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <File className="h-8 w-8" />
            Templates de Email Dinâmicos
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema completo de gerenciamento de templates com variáveis dinâmicas
          </p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <File className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Templates Ativos</p>
                <p className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Templates Predefinidos</p>
              <p className="text-2xl font-bold">{predefinedTemplates.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Variáveis Disponíveis</p>
              <p className="text-2xl font-bold">25+</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">Lista de Templates</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="predefined">Templates Predefinidos</TabsTrigger>
        </TabsList>

        {/* Lista de Templates */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.subject}
                      </p>
                    </div>
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Variáveis ({template.variables.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                        {template.variables.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Criado: {template.createdAt.toLocaleDateString()}</span>
                      <span>Atualizado: {template.updatedAt.toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handlePreviewTemplate(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleEditTemplate(template)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Editor */}
        <TabsContent value="editor">
          <EmailTemplateManager
            template={selectedTemplate}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview">
          {selectedTemplate ? (
            <DynamicEmailPreview
              subject={selectedTemplate.subject}
              htmlContent={selectedTemplate.htmlContent}
              textContent={selectedTemplate.textContent}
              variables={selectedTemplate.variables}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum template selecionado</h3>
                <p className="text-muted-foreground mb-4">
                  Selecione um template da lista para visualizar o preview
                </p>
                <Button onClick={() => setActiveTab('list')}>
                  Ver Templates
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Predefinidos */}
        <TabsContent value="predefined">
          <Card>
            <CardHeader>
              <CardTitle>Templates Predefinidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione um template predefinido para começar rapidamente
              </p>
            </CardHeader>
            <CardContent>
              <EmailTemplateSelector
                onTemplateSelect={(tpl: any) => {
                   const emailTemplate: EmailTemplate = {
                     id: Date.now().toString(),
                     name: tpl.name,
                     subject: tpl.subject,
                     htmlContent: tpl.htmlContent,
                     textContent: tpl.textContent || '',
                     tags: tpl.tags || [],
                     variables: tpl.variables || [],
                     isActive: true,
                     createdAt: new Date(),
                     updatedAt: new Date(),
                   }
                   setSelectedTemplate(emailTemplate)
                   setActiveTab('editor')
                 }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}