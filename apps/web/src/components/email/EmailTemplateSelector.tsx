'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'
import { getAllPredefinedTemplates, convertToEmailTemplate, type PredefinedTemplate } from '@/lib/email-templates'
import { toast } from 'sonner'

interface EmailTemplateSelectorProps {
  onTemplateSelect?: (template: any) => void
}

export function EmailTemplateSelector({ onTemplateSelect }: EmailTemplateSelectorProps) {
  const [predefinedTemplates] = useState<PredefinedTemplate[]>(getAllPredefinedTemplates())
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const handleApplyTemplate = () => {
    const predefinedTemplate = predefinedTemplates.find(t => t.id === selectedTemplate)
    if (predefinedTemplate) {
      const emailTemplate = convertToEmailTemplate(predefinedTemplate)
      onTemplateSelect?.({
        name: emailTemplate.name,
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.htmlContent,
        textContent: emailTemplate.textContent || '',
        category: emailTemplate.category,
        variables: emailTemplate.variables
      })
      setSelectedTemplate('')
      toast.success('Template aplicado com sucesso!')
    }
  }

  const selectedTemplateData = predefinedTemplates.find(t => t.id === selectedTemplate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Templates Predefinidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="predefined-template">Selecionar Template</Label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um template predefinido" />
              </SelectTrigger>
              <SelectContent>
                {predefinedTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate}
            variant="outline"
          >
            Aplicar Template
          </Button>
        </div>
        
        {selectedTemplateData && (
          <div className="p-3 bg-muted rounded-md">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedTemplateData.name}</p>
                <Badge variant="secondary">{selectedTemplateData.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{selectedTemplateData.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplateData.variables.slice(0, 8).map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                  {selectedTemplateData.variables.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedTemplateData.variables.length - 8} mais
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {predefinedTemplates.slice(0, 8).map((template) => (
            <Button
              key={template.id}
              variant="outline"
              size="sm"
              className="h-auto p-2 flex flex-col items-start text-left"
              onClick={() => {
                setSelectedTemplate(template.id)
                const emailTemplate = convertToEmailTemplate(template)
                onTemplateSelect?.({
                  name: emailTemplate.name,
                  subject: emailTemplate.subject,
                  htmlContent: emailTemplate.htmlContent,
                  textContent: emailTemplate.textContent || '',
                  category: emailTemplate.category,
                  variables: emailTemplate.variables
                })
                toast.success(`Template "${template.name}" aplicado!`)
              }}
            >
              <div className="w-full">
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-medium truncate">{template.name}</span>
                  <Badge variant="outline" className="text-xs ml-1">
                    {template.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}