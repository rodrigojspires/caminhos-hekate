'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Code, Smartphone, Monitor } from 'lucide-react'
import { usePreviewData } from '@/hooks/useSystemSettings'

interface DynamicEmailPreviewProps {
  subject: string
  htmlContent: string
  textContent?: string
  variables?: string[]
  customVariables?: Record<string, string>
}

export function DynamicEmailPreview({
  subject,
  htmlContent,
  textContent,
  variables = [],
  customVariables = {}
}: DynamicEmailPreviewProps) {
  const { sampleData, getAllVariablesByCategory } = usePreviewData(customVariables)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [processedSubject, setProcessedSubject] = useState('')
  const [processedHtml, setProcessedHtml] = useState('')
  const [processedText, setProcessedText] = useState('')

  // Processar conteúdo substituindo variáveis
  useEffect(() => {
    const processContent = (content: string) => {
      return Object.entries(sampleData).reduce((processed, [key, value]) => {
        const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g')
        return processed.replace(regex, String(value))
      }, content)
    }

    setProcessedSubject(processContent(subject))
    setProcessedHtml(processContent(htmlContent))
    setProcessedText(processContent(textContent || ''))
  }, [subject, htmlContent, textContent, sampleData])

  const detectedVariables = React.useMemo(() => {
    const allContent = `${subject} ${htmlContent} ${textContent || ''}`
    const variableRegex = /\{\{([^}]+)\}\}/g
    const matches = [...allContent.matchAll(variableRegex)]
    return [...new Set(matches.map(match => `{{${match[1]}}}`))]
  }, [subject, htmlContent, textContent])

  const categorizedVariables = React.useMemo(() => {
    return getAllVariablesByCategory()
  }, [getAllVariablesByCategory])

  return (
    <div className="space-y-4">
      {/* Controles de Preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="font-medium">Preview Dinâmico</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Variáveis Detectadas */}
      {detectedVariables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Variáveis Detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {detectedVariables.map((variable) => {
                const hasValue = sampleData[variable.replace(/[{}]/g, '')]
                return (
                  <Badge
                    key={variable}
                    variant={hasValue ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {variable}
                    {hasValue && (
                      <span className="ml-1 opacity-70">
                        → {String(sampleData[variable.replace(/[{}]/g, '')]).slice(0, 20)}
                        {String(sampleData[variable.replace(/[{}]/g, '')]).length > 20 ? '...' : ''}
                      </span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variáveis Disponíveis por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(categorizedVariables).map(([category, categoryVars]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {categoryVars.map((variable) => (
                    <Badge key={variable.key} variant="secondary" className="text-xs">
                      {variable.key}
                      <span className="ml-1 opacity-70">→ {variable.label}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview do Email */}
      <Tabs defaultValue="html" className="w-full">
        <TabsList>
          <TabsTrigger value="html">HTML Preview</TabsTrigger>
          <TabsTrigger value="text">Texto Simples</TabsTrigger>
          <TabsTrigger value="code">Código HTML</TabsTrigger>
        </TabsList>
        
        <TabsContent value="html" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assunto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{processedSubject}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conteúdo HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className={`border rounded-lg overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                }`}
              >
                <div 
                  className="p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: processedHtml }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assunto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{processedSubject}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conteúdo em Texto</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                {processedText || 'Nenhum conteúdo em texto definido'}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Code className="h-4 w-4" />
                Código HTML
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                <code>{processedHtml}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}