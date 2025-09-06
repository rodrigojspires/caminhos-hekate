'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { EmailTemplateEditor } from '@/components/email/EmailTemplateEditor'
import { TemplateEditor } from '@/components/email/TemplateEditor'
import { EmailTemplateList } from '@/components/email/EmailTemplateList'
import { EmailCampaignManager } from '@/components/email/EmailCampaignManager'
import { EmailStatsViewer } from '@/components/email/EmailStatsViewer'
import { Plus, Mail, Send, BarChart3 } from 'lucide-react'
import type {
  EmailTemplate,
  EmailCampaign,
  EmailCategory as EmailTemplateCategory,
  EmailTemplateStatus,
  EmailCampaignStatus,
} from '@/lib/email'

interface EmailTemplatesPageState {
  templates: EmailTemplate[]
  campaigns: EmailCampaign[]
  stats: any
  chartData: any[]
  isLoading: boolean
  currentPage: number
  pageSize: number
  totalCount: number
  searchTerm: string
  selectedCategory?: EmailTemplateCategory
  selectedStatus?: EmailTemplateStatus
  activeTemplate?: EmailTemplate
  showEditor: boolean
}

export default function EmailTemplatesPage() {
  const [state, setState] = useState<EmailTemplatesPageState>({
    templates: [],
    campaigns: [],
    stats: {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalUnsubscribed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      clickToOpenRate: 0
    },
    chartData: [],
    isLoading: false,
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    searchTerm: '',
    showEditor: false
  })

  const [activeTab, setActiveTab] = useState('templates')

  const loadTemplates = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const params = new URLSearchParams({
        page: state.currentPage.toString(),
        limit: state.pageSize.toString(),
        ...(state.searchTerm && { search: state.searchTerm }),
        ...(state.selectedCategory && { category: state.selectedCategory }),
        ...(state.selectedStatus && { status: state.selectedStatus })
      })

      const response = await fetch(`/api/email/templates?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar templates')
      
      const data = await response.json()
      setState(prev => ({
        ...prev,
        templates: data.templates,
        totalCount: data.total,
        isLoading: false
      }))
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast.error('Erro ao carregar templates')
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [state.currentPage, state.pageSize, state.searchTerm, state.selectedCategory, state.selectedStatus])

  // Carregar dados iniciais
  useEffect(() => {
    loadTemplates()
    loadCampaigns()
    loadStats()
  }, [loadTemplates])

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/email/campaigns')
      if (!response.ok) throw new Error('Erro ao carregar campanhas')
      
      const data = await response.json()
      setState(prev => ({ ...prev, campaigns: data.campaigns }))
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error)
      toast.error('Erro ao carregar campanhas')
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/email/stats')
      if (!response.ok) throw new Error('Erro ao carregar estatísticas')
      
      const data = await response.json()
      setState(prev => ({ 
        ...prev, 
        stats: data.stats,
        chartData: data.chartData || []
      }))
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    }
  }

  // Handlers para Templates
  const handleCreateTemplate = async (templateData: EmailTemplate | Partial<EmailTemplate>) => {
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (!response.ok) throw new Error('Erro ao criar template')
      
      const newTemplate = await response.json()
      setState(prev => ({
        ...prev,
        templates: [newTemplate, ...prev.templates],
        showEditor: false
      }))
      
      toast.success('Template criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar template:', error)
      toast.error('Erro ao criar template')
    }
  }

  const handleUpdateTemplate = async (templateData: EmailTemplate | Partial<EmailTemplate>) => {
    try {
      const response = await fetch(`/api/email/templates/${templateData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (!response.ok) throw new Error('Erro ao atualizar template')
      
      const updatedTemplate = await response.json()
      setState(prev => ({
        ...prev,
        templates: prev.templates.map(t => 
          t.id === updatedTemplate.id ? updatedTemplate : t
        ),
        activeTemplate: undefined,
        showEditor: false
      }))
      
      toast.success('Template atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar template:', error)
      toast.error('Erro ao atualizar template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/email/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao deletar template')
      
      setState(prev => ({
        ...prev,
        templates: prev.templates.filter(t => t.id !== templateId)
      }))
      
      toast.success('Template deletado com sucesso!')
    } catch (error) {
      console.error('Erro ao deletar template:', error)
      toast.error('Erro ao deletar template')
    }
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    const duplicatedTemplate = {
      ...template,
      name: `${template.name} (Cópia)`,
      slug: `${template.slug}-copy-${Date.now()}`,
      status: 'DRAFT' as EmailTemplateStatus
    }
    
    delete (duplicatedTemplate as any).id
    delete (duplicatedTemplate as any).createdAt
    delete (duplicatedTemplate as any).updatedAt
    
    await handleCreateTemplate(duplicatedTemplate)
  }

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/email/templates/${template.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: {} })
      })

      if (!response.ok) throw new Error('Erro ao gerar preview')
      
      const preview = await response.json()
      
      // Abrir preview em nova janela
      const previewWindow = window.open('', '_blank')
      if (previewWindow) {
        previewWindow.document.write(preview.html)
        previewWindow.document.close()
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error)
      toast.error('Erro ao gerar preview')
    }
  }

  const handleSendTest = async (template: EmailTemplate, testEmail: string) => {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          to: testEmail,
          variables: {},
          priority: 'HIGH'
        })
      })

      if (!response.ok) throw new Error('Erro ao enviar email de teste')
      
      toast.success(`Email de teste enviado para ${testEmail}!`)
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error)
      toast.error('Erro ao enviar email de teste')
    }
  }

  // Handlers para Campanhas
  const handleCreateCampaign = async (campaignData: Partial<EmailCampaign>) => {
    try {
      const response = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      })

      if (!response.ok) throw new Error('Erro ao criar campanha')
      
      const newCampaign = await response.json()
      setState(prev => ({
        ...prev,
        campaigns: [newCampaign, ...prev.campaigns]
      }))
      
      toast.success('Campanha criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar campanha:', error)
      toast.error('Erro ao criar campanha')
    }
  }

  const handleUpdateCampaign = async (campaign: EmailCampaign) => {
    try {
      const response = await fetch(`/api/email/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign)
      })

      if (!response.ok) throw new Error('Erro ao atualizar campanha')
      
      const updatedCampaign = await response.json()
      setState(prev => ({
        ...prev,
        campaigns: prev.campaigns.map(c => 
          c.id === updatedCampaign.id ? updatedCampaign : c
        )
      }))
      
      toast.success('Campanha atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error)
      toast.error('Erro ao atualizar campanha')
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/email/campaigns/${campaignId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao deletar campanha')
      
      setState(prev => ({
        ...prev,
        campaigns: prev.campaigns.filter(c => c.id !== campaignId)
      }))
      
      toast.success('Campanha deletada com sucesso!')
    } catch (error) {
      console.error('Erro ao deletar campanha:', error)
      toast.error('Erro ao deletar campanha')
    }
  }

  // Handlers para filtros e busca
  const handleSearch = (searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm, currentPage: 1 }))
  }

  const handleFilterChange = (filters: any) => {
    setState(prev => ({ 
      ...prev, 
      selectedCategory: filters.category,
      selectedStatus: filters.status,
      currentPage: 1 
    }))
  }

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Email</h1>
          <p className="text-muted-foreground">
            Gerencie templates, campanhas e acompanhe estatísticas de email marketing
          </p>
        </div>
        <Button 
          onClick={() => setState(prev => ({ ...prev, showEditor: true, activeTemplate: undefined }))}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Editor
          </TabsTrigger>
        </TabsList>

        {/* Templates */}
        <TabsContent value="templates">
          <EmailTemplateList
            templates={state.templates}
            totalCount={state.totalCount}
            currentPage={state.currentPage}
            pageSize={state.pageSize}
            isLoading={state.isLoading}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onEdit={(template) => {
              setState(prev => ({ ...prev, activeTemplate: template, showEditor: true }))
              setActiveTab('editor')
            }}
            onDelete={handleDeleteTemplate}
            onDuplicate={handleDuplicateTemplate}
            onPreview={handlePreviewTemplate}
            onSendTest={handleSendTest}
          />
        </TabsContent>

        {/* Campanhas */}
        <TabsContent value="campaigns">
          <EmailCampaignManager
            campaigns={state.campaigns}
            templates={state.templates}
            totalCount={state.campaigns.length}
            currentPage={1}
            pageSize={10}
            isLoading={state.isLoading}
            onCreate={handleCreateCampaign}
            onEdit={handleUpdateCampaign}
            onDelete={handleDeleteCampaign}
            onStart={async (campaignId) => {
              // Implementar lógica de iniciar campanha
              toast.success('Campanha iniciada!')
            }}
            onPause={async (campaignId) => {
              // Implementar lógica de pausar campanha
              toast.success('Campanha pausada!')
            }}
            onStop={async (campaignId) => {
              // Implementar lógica de parar campanha
              toast.success('Campanha parada!')
            }}
            onPreview={async (campaign) => {
              // Implementar preview de campanha
              toast.info('Preview da campanha')
            }}
          />
        </TabsContent>

        {/* Estatísticas */}
        <TabsContent value="stats">
          <EmailStatsViewer
            stats={state.stats}
            chartData={state.chartData}
            isLoading={state.isLoading}
            onRefresh={loadStats}
            onExport={async (filters) => {
              // Implementar exportação de dados
              toast.success('Dados exportados!')
            }}
            onFilterChange={async (filters) => {
              // Implementar filtros de estatísticas
              await loadStats()
            }}
          />
        </TabsContent>

        {/* Editor */}
        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmailTemplateEditor
              template={state.activeTemplate}
              onSave={state.activeTemplate ? handleUpdateTemplate : handleCreateTemplate}
              onCancel={() => {
                setState(prev => ({ ...prev, activeTemplate: undefined, showEditor: false }))
                setActiveTab('templates')
              }}
            />
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Editor Visual (beta)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplateEditor
                    onExport={({ html }) => {
                      setState(prev => ({ ...prev }))
                      // push exported html into current form
                      // naive approach: set into active template, or create new
                      if (state.activeTemplate) {
                        handleUpdateTemplate({ ...state.activeTemplate, htmlContent: html })
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
