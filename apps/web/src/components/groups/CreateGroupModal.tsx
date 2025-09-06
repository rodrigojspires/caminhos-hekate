'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Upload, 
  X, 
  Users, 
  Lock, 
  Globe,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface CreateGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupCreated?: (group: any) => void
}

interface GroupFormData {
  name: string
  description: string
  isPrivate: boolean
  maxMembers: number
  imageUrl?: string
  tags: string[]
  category: string
}

const GROUP_CATEGORIES = [
  { value: 'study', label: 'Estudos' },
  { value: 'practice', label: 'Práticas' },
  { value: 'meditation', label: 'Meditação' },
  { value: 'rituals', label: 'Rituais' },
  { value: 'divination', label: 'Divinação' },
  { value: 'herbs', label: 'Ervas e Plantas' },
  { value: 'crystals', label: 'Cristais' },
  { value: 'astrology', label: 'Astrologia' },
  { value: 'tarot', label: 'Tarô' },
  { value: 'general', label: 'Geral' }
]

const SUGGESTED_TAGS = [
  'iniciantes', 'avançado', 'lua-nova', 'lua-cheia', 'sabbats',
  'esbats', 'proteção', 'cura', 'prosperidade', 'amor',
  'sabedoria', 'transformação', 'elementos', 'deusas', 'deuses'
]

export function CreateGroupModal({
  open,
  onOpenChange,
  onGroupCreated
}: CreateGroupModalProps) {
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    isPrivate: false,
    maxMembers: 50,
    tags: [],
    category: ''
  })
  const [newTag, setNewTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do grupo é obrigatório'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres'
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

    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória'
    }

    if (formData.maxMembers < 2) {
      newErrors.maxMembers = 'Grupo deve permitir pelo menos 2 membros'
    } else if (formData.maxMembers > 500) {
      newErrors.maxMembers = 'Grupo pode ter no máximo 500 membros'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB')
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, imageUrl: undefined }))
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !formData.tags.includes(trimmedTag) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      let imageUrl = formData.imageUrl
      
      // Upload image if provided
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('file', imageFile)
        imageFormData.append('type', 'group-image')
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData
        })
        
        const uploadData = await uploadResponse.json()
        
        if (uploadData.success) {
          imageUrl = uploadData.data.url
        } else {
          toast.error('Erro ao fazer upload da imagem')
          return
        }
      }

      // Create group
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          imageUrl
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Grupo criado com sucesso!')
        onGroupCreated?.(data.data)
        onOpenChange(false)
        resetForm()
      } else {
        toast.error(data.error || 'Erro ao criar grupo')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Erro ao criar grupo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isPrivate: false,
      maxMembers: 50,
      tags: [],
      category: ''
    })
    setNewTag('')
    setImageFile(null)
    setImagePreview(null)
    setErrors({})
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Criar Novo Grupo
          </DialogTitle>
          <DialogDescription>
            Crie um grupo para conectar-se com outros praticantes que compartilham seus interesses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Image */}
          <div className="space-y-2">
            <Label>Imagem do Grupo (Opcional)</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={imagePreview} alt="Preview da imagem do grupo" />
                    <AvatarFallback>
                      <ImageIcon className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('group-image-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Escolher Imagem
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG até 5MB
                </p>
              </div>
            </div>
            <input
              id="group-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Grupo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Círculo da Lua Nova"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.name}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.category}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o propósito e foco do seu grupo..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formData.description.length}/500 caracteres</span>
              {errors.description && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  {formData.isPrivate ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  Grupo Privado
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.isPrivate 
                    ? 'Apenas membros convidados podem ver e participar'
                    : 'Qualquer pessoa pode encontrar e solicitar entrada'
                  }
                </p>
              </div>
              <Switch
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
              />
            </div>
          </div>

          {/* Max Members */}
          <div className="space-y-2">
            <Label htmlFor="maxMembers">Limite de Membros</Label>
            <Input
              id="maxMembers"
              type="number"
              min="2"
              max="500"
              value={formData.maxMembers}
              onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 50 }))}
              className={errors.maxMembers ? 'border-red-500' : ''}
            />
            {errors.maxMembers && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.maxMembers}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Opcional)</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(newTag)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addTag(newTag)}
                  disabled={!newTag.trim() || formData.tags.length >= 10}
                >
                  Adicionar
                </Button>
              </div>
              
              {/* Current tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Suggested tags */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Sugestões:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.filter(tag => !formData.tags.includes(tag)).slice(0, 8).map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTag(tag)}
                      disabled={formData.tags.length >= 10}
                      className="h-7 text-xs"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar Grupo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}