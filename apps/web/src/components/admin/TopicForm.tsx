'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Save, X, Palette, Eye } from 'lucide-react'

interface Topic {
  id?: string
  name: string
  description: string
  color: string
  isActive: boolean
}

interface TopicFormProps {
  topic?: Topic
  onSubmit: (data: Omit<Topic, 'id'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const PRESET_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#8B5A2B', // Brown
  '#6B7280', // Gray
  '#059669', // Emerald
  '#DC2626', // Red-600
  '#7C3AED', // Violet
]

export function TopicForm({ topic, onSubmit, onCancel, isLoading = false }: TopicFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Omit<Topic, 'id'>>({
    name: topic?.name || '',
    description: topic?.description || '',
    color: topic?.color || '#8B5CF6',
    isActive: topic?.isActive ?? true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres'
    } else if (formData.description.length > 500) {
      newErrors.description = 'Descrição deve ter no máximo 500 caracteres'
    }

    if (!formData.color || !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = 'Cor deve ser um código hexadecimal válido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Erro ao salvar tópico:', error)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleColorSelect = (color: string) => {
    handleInputChange('color', color)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulário */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Tópico</CardTitle>
                <CardDescription>
                  Preencha as informações básicas do tópico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Tarot, Astrologia, Numerologia..."
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descreva sobre o que é este tópico e que tipo de conteúdo será compartilhado..."
                    rows={4}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formData.description.length}/500 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cor do Tópico *</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        placeholder="#8B5CF6"
                        className={`font-mono ${errors.color ? 'border-red-500' : ''}`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Palette className="h-4 w-4" />
                        Cores sugeridas:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleColorSelect(color)}
                            className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                              formData.color === color ? 'border-gray-900 shadow-md' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {errors.color && (
                    <p className="text-sm text-red-500">{errors.color}</p>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="isActive">Status do Tópico</Label>
                    <p className="text-sm text-muted-foreground">
                      Tópicos ativos podem receber novos posts
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  Veja como o tópico aparecerá para os usuários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: formData.color }}
                    />
                    <h3 className="font-semibold">
                      {formData.name || 'Nome do Tópico'}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={formData.isActive ? 'text-green-600 border-green-600' : 'text-gray-600 border-gray-600'}
                    >
                      {formData.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formData.description || 'Descrição do tópico aparecerá aqui...'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>0 posts</span>
                    <span>•</span>
                    <span>0 membros</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Como aparecerá na lista:</h4>
                  <div className="border rounded p-3 flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: formData.color }}
                    />
                    <span className="text-sm">
                      {formData.name || 'Nome do Tópico'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Escolha um nome claro e descritivo</p>
                <p>• A descrição ajuda os usuários a entender o propósito do tópico</p>
                <p>• Use cores que façam sentido com o tema (ex: verde para natureza)</p>
                <p>• Tópicos inativos não aparecem para novos posts</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Salvando...' : topic ? 'Atualizar Tópico' : 'Criar Tópico'}
          </Button>
        </div>
      </form>
    </div>
  )
}