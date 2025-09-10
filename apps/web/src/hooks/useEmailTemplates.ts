'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface EmailTemplate {
  id: string
  name: string
  slug: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: Record<string, any>
  category: 'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'SYSTEM' | 'WELCOME' | 'CONFIRMATION' | 'REMINDER' | 'NEWSLETTER'
  tags: string[]
  previewData?: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEmailTemplateData {
  name: string
  slug: string
  subject: string
  htmlContent: string
  textContent?: string
  variables?: Record<string, any>
  category: EmailTemplate['category']
  tags: string[]
  previewData?: Record<string, any>
}

export interface UpdateEmailTemplateData extends Partial<CreateEmailTemplateData> {
  id: string
}

export interface EmailTemplateFilters {
  category?: string
  status?: string
  tags?: string[]
  search?: string
  page?: number
  limit?: number
}

export interface EmailTemplateListResponse {
  templates: EmailTemplate[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async (filters?: EmailTemplateFilters) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      
      if (filters?.category) params.append('category', filters.category)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.tags?.length) params.append('tags', filters.tags.join(','))
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const response = await fetch(`/api/email/templates?${params.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar templates')
      }
      
      if (data.success) {
        setTemplates(data.data)
        return {
          templates: data.data,
          pagination: data.pagination
        } as EmailTemplateListResponse
      } else {
        throw new Error(data.error || 'Erro ao carregar templates')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao carregar templates')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getTemplate = useCallback(async (id: string): Promise<EmailTemplate> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/email/templates/${id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar template')
      }
      
      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Erro ao carregar template')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao carregar template')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createTemplate = useCallback(async (templateData: CreateEmailTemplateData): Promise<EmailTemplate> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar template')
      }
      
      if (data.success) {
        toast.success('Template criado com sucesso')
        // Atualizar lista local
        setTemplates(prev => [data.data, ...prev])
        return data.data
      } else {
        throw new Error(data.error || 'Erro ao criar template')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao criar template')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTemplate = useCallback(async (templateData: UpdateEmailTemplateData): Promise<EmailTemplate> => {
    setLoading(true)
    setError(null)
    
    try {
      const { id, ...updateData } = templateData
      
      const response = await fetch(`/api/email/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar template')
      }
      
      if (data.success) {
        toast.success('Template atualizado com sucesso')
        // Atualizar lista local
        setTemplates(prev => prev.map(t => t.id === id ? data.data : t))
        return data.data
      } else {
        throw new Error(data.error || 'Erro ao atualizar template')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao atualizar template')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/email/templates/${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir template')
      }
      
      if (data.success) {
        toast.success('Template excluído com sucesso')
        // Remover da lista local
        setTemplates(prev => prev.filter(t => t.id !== id))
      } else {
        throw new Error(data.error || 'Erro ao excluir template')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao excluir template')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const previewTemplate = useCallback(async (templateData: CreateEmailTemplateData & { variables?: Record<string, any> }): Promise<{ html: string; text?: string }> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/email/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar preview')
      }
      
      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Erro ao gerar preview')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao gerar preview')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const sendTestEmail = useCallback(async (templateData: CreateEmailTemplateData & { variables?: Record<string, any>; testEmail: string }): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar email de teste')
      }
      
      if (data.success) {
        toast.success('Email de teste enviado com sucesso')
      } else {
        throw new Error(data.error || 'Erro ao enviar email de teste')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error('Erro ao enviar email de teste')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
    sendTestEmail
  }
}