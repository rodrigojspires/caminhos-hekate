'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, Video, FileText, X, Plus, Tag, Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  description: string
  color: string
}

interface CommunityOption {
  id: string
  name: string
}

interface Course {
  id: string
  name: string
  lessons: {
    id: string
    name: string
  }[]
}

interface Attachment {
  id: string
  type: 'image' | 'video' | 'document'
  file: File
  url: string
  name: string
  size: number
  uploadProgress?: number
}

interface PostData {
  title: string
  content: string
  category: string
  communityIds: string[]
  tags: string[]
  courseId?: string
  lessonId?: string
  attachments: Attachment[]
  isDraft: boolean
  allowComments: boolean
  isPinned: boolean
  isFeatured: boolean
}

interface PostEditorProps {
  initialData?: Partial<PostData>
  categories: Category[]
  communities?: CommunityOption[]
  courses?: Course[]
  isEditing?: boolean
  isLoading?: boolean
  onSave: (data: PostData) => Promise<void>
  onCancel: () => void
  onPreview?: (data: PostData) => void
  maxAttachments?: number
  maxFileSize?: number // in MB
  allowedFileTypes?: string[]
  className?: string
}

export function PostEditor({
  initialData,
  categories,
  communities = [],
  courses = [],
  isEditing = false,
  isLoading = false,
  onSave,
  onCancel,
  onPreview,
  maxAttachments = 5,
  maxFileSize = 10,
  allowedFileTypes = ['image/*', 'video/*', '.pdf', '.doc', '.docx'],
  className
}: PostEditorProps) {
  const [postData, setPostData] = useState<PostData>({
    title: '',
    content: '',
    category: '',
    communityIds: [],
    tags: [],
    attachments: [],
    isDraft: false,
    allowComments: true,
    isPinned: false,
    isFeatured: false,
    ...initialData
  })
  
  const [tagInput, setTagInput] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  
  const selectedCourse = courses.find(course => course.id === postData.courseId)

  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!postData.title.trim()) {
      newErrors.title = 'Título é obrigatório'
    } else if (postData.title.length < 5) {
      newErrors.title = 'Título deve ter pelo menos 5 caracteres'
    } else if (postData.title.length > 200) {
      newErrors.title = 'Título deve ter no máximo 200 caracteres'
    }
    
    if (!postData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório'
    } else if (postData.content.length < 10) {
      newErrors.content = 'Conteúdo deve ter pelo menos 10 caracteres'
    }
    
    if (!postData.category) {
      newErrors.category = 'Categoria é obrigatória'
    }

    if (communities.length > 0 && postData.communityIds.length === 0) {
      newErrors.communityIds = 'Selecione ao menos uma comunidade'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (asDraft = false) => {
    if (!asDraft && !validateForm()) {
      return
    }
    
    try {
      await onSave({
        ...postData,
        isDraft: asDraft
      })
    } catch (error) {
      console.error('Erro ao salvar post:', error)
    }
  }

  const handleFileUpload = (files: FileList) => {
    const newAttachments: Attachment[] = []
    
    Array.from(files).forEach((file) => {
      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande. Tamanho máximo: ${maxFileSize}MB`)
        return
      }
      
      // Validate file type
      const isValidType = allowedFileTypes.some(type => {
        if (type.includes('*')) {
          return file.type.startsWith(type.replace('*', ''))
        }
        return file.name.toLowerCase().endsWith(type)
      })
      
      if (!isValidType) {
        alert(`Tipo de arquivo ${file.name} não é permitido`)
        return
      }
      
      // Check attachment limit
      if (postData.attachments.length + newAttachments.length >= maxAttachments) {
        alert(`Máximo de ${maxAttachments} anexos permitidos`)
        return
      }
      
      const attachment: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'document',
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        uploadProgress: 0
      }
      
      newAttachments.push(attachment)
    })
    
    if (newAttachments.length > 0) {
      setPostData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }))
      
      // Simulate upload progress
      newAttachments.forEach((attachment) => {
        simulateUpload(attachment.id)
      })
    }
  }

  const simulateUpload = (attachmentId: string) => {
    setIsUploading(true)
    let progress = 0
    
    const interval = setInterval(() => {
      progress += Math.random() * 30
      
      setPostData(prev => ({
        ...prev,
        attachments: prev.attachments.map(att => 
          att.id === attachmentId 
            ? { ...att, uploadProgress: Math.min(progress, 100) }
            : att
        )
      }))
      
      if (progress >= 100) {
        clearInterval(interval)
        setIsUploading(false)
      }
    }, 200)
  }

  const removeAttachment = (attachmentId: string) => {
    setPostData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }))
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !postData.tags.includes(tag) && postData.tags.length < 10) {
      setPostData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setPostData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getSelectedCategory = () => {
    return categories.find(cat => cat.id === postData.category)
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isEditing ? 'Editar Post' : 'Criar Novo Post'}</span>
          <div className="flex items-center space-x-2">
            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPreview(!showPreview)
                  if (!showPreview) {
                    onPreview(postData)
                  }
                }}
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showPreview ? 'Editar' : 'Visualizar'}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {!showPreview ? (
          <>
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                ref={titleInputRef}
                placeholder="Digite o título do seu post..."
                value={postData.title}
                onChange={(e) => {
                  setPostData(prev => ({ ...prev, title: e.target.value }))
                  if (errors.title) {
                    setErrors(prev => ({ ...prev, title: '' }))
                  }
                }}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {postData.title.length}/200 caracteres
              </p>
            </div>

            {/* Category and Course */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={postData.category}
                  onValueChange={(value) => {
                    setPostData(prev => ({ ...prev, category: value }))
                    if (errors.category) {
                      setErrors(prev => ({ ...prev, category: '' }))
                    }
                  }}
                >
                  <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>

              {courses.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="course">Curso (opcional)</Label>
                  <Select
                    value={postData.courseId || ''}
                    onValueChange={(value) => {
                      setPostData(prev => ({ 
                        ...prev, 
                        courseId: value || undefined,
                        lessonId: undefined // Reset lesson when course changes
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum curso</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {communities.length > 0 && (
              <div className="space-y-2">
                <Label>Comunidades *</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {communities.map((community) => (
                    <label key={community.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={postData.communityIds.includes(community.id)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setPostData((prev) => ({
                            ...prev,
                            communityIds: checked
                              ? [...prev.communityIds, community.id]
                              : prev.communityIds.filter((id) => id !== community.id)
                          }))
                          if (errors.communityIds) {
                            setErrors((prev) => ({ ...prev, communityIds: '' }))
                          }
                        }}
                      />
                      <span>{community.name}</span>
                    </label>
                  ))}
                </div>
                {errors.communityIds && (
                  <p className="text-sm text-destructive">{errors.communityIds}</p>
                )}
              </div>
            )}

            {/* Lesson Selection */}
            {selectedCourse && selectedCourse.lessons.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="lesson">Aula (opcional)</Label>
                <Select
                  value={postData.lessonId || ''}
                  onValueChange={(value) => {
                    setPostData(prev => ({ 
                      ...prev, 
                      lessonId: value || undefined
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma aula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma aula específica</SelectItem>
                    {selectedCourse.lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                placeholder="Escreva o conteúdo do seu post..."
                value={postData.content}
                onChange={(e) => {
                  setPostData(prev => ({ ...prev, content: e.target.value }))
                  if (errors.content) {
                    setErrors(prev => ({ ...prev, content: '' }))
                  }
                }}
                rows={8}
                className={errors.content ? 'border-destructive' : ''}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {postData.content.length} caracteres
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Adicionar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={addTag}
                  size="sm"
                  variant="outline"
                  aria-label="Adicionar tag"
                  title="Adicionar tag"
                >
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              
              {postData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {postData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Remover tag ${tag}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          removeTag(tag)
                        }
                      }}
                    >
                      #{tag} ×
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {postData.tags.length}/10 tags
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Anexos</Label>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={allowedFileTypes.join(',')}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                
                <div className="space-y-2">
                  <div className="flex justify-center space-x-2">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <Video className="w-8 h-8 text-muted-foreground" />
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Arraste arquivos aqui ou{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      clique para selecionar
                    </Button>
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    Máximo {maxAttachments} arquivos • {maxFileSize}MB cada
                  </p>
                </div>
              </div>
              
              {postData.attachments.length > 0 && (
                <div className="space-y-2">
                  {postData.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{attachment.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {attachment.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </span>
                          
                          {attachment.uploadProgress !== undefined && attachment.uploadProgress < 100 && (
                            <div className="flex-1">
                              <Progress value={attachment.uploadProgress} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        aria-label={`Remover anexo ${attachment.name}`}
                        title={`Remover anexo ${attachment.name}`}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <Label>Configurações</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-comments">Permitir comentários</Label>
                    <p className="text-xs text-muted-foreground">
                      Outros usuários poderão comentar neste post
                    </p>
                  </div>
                  <Switch
                    id="allow-comments"
                    checked={postData.allowComments}
                    onCheckedChange={(checked) => 
                      setPostData(prev => ({ ...prev, allowComments: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pin-post">Fixar post</Label>
                    <p className="text-xs text-muted-foreground">
                      Este post aparecerá no topo da lista
                    </p>
                  </div>
                  <Switch
                    id="pin-post"
                    checked={postData.isPinned}
                    onCheckedChange={(checked) => 
                      setPostData(prev => ({ ...prev, isPinned: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="feature-post">Post em destaque</Label>
                    <p className="text-xs text-muted-foreground">
                      Este post receberá destaque especial
                    </p>
                  </div>
                  <Switch
                    id="feature-post"
                    checked={postData.isFeatured}
                    onCheckedChange={(checked) => 
                      setPostData(prev => ({ ...prev, isFeatured: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={isLoading || isUploading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Rascunho
                </Button>
                
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isLoading || isUploading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isEditing ? 'Atualizar' : 'Publicar'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Eye className="w-4 h-4" />
              <AlertDescription>
                Esta é uma visualização do seu post. Clique em &quot;Editar&quot; para fazer alterações.
              </AlertDescription>
            </Alert>
            
            {/* Preview content would go here */}
            <div className="prose prose-sm max-w-none">
              <h2>{postData.title}</h2>
              
              {getSelectedCategory() && (
                <Badge style={{ backgroundColor: getSelectedCategory()?.color }}>
                  {getSelectedCategory()?.name}
                </Badge>
              )}
              
              <div className="whitespace-pre-wrap">{postData.content}</div>
              
              {postData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {postData.tags.map((tag) => (
                    <Badge key={tag} variant="outline">#{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PostEditor
