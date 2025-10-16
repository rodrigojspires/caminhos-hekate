'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Video, Edit2, ChevronRight, Upload, Paperclip, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB
const ACCEPTED_ASSET_TYPES = [
  'application/pdf',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/json',
  'application/octet-stream'
]
const MAX_ASSET_SIZE = 50 * 1024 * 1024 // 50MB

interface LessonAsset {
  id: string
  title: string
  type: string
  url: string
  size?: number | null
  createdAt?: string | null
}

interface Lesson {
  id: string
  title: string
  description?: string | null
  content?: string | null
  videoUrl?: string | null
  videoStorage?: {
    url?: string | null
    filename?: string | null
    size?: number | null
    type?: string | null
  } | null
  videoDuration?: number | null
  order: number
  isFree: boolean
  assets: LessonAsset[]
}

interface Module {
  id: string
  title: string
  description?: string | null
  order: number
  lessons: Lesson[]
}

interface CourseContentResponse {
  id: string
  title: string
  modules: Module[]
}

interface CourseContentManagerProps {
  courseId: string
}

type ModuleFormState = {
  title: string
  description: string
}

type LessonFormState = {
  id?: string
  title: string
  description: string
  content: string
  videoUrl: string
  videoStorage: Lesson['videoStorage']
  videoDuration: string
  isFree: boolean
}

export function CourseContentManager({ courseId }: CourseContentManagerProps) {
  const [data, setData] = useState<CourseContentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingModule, setCreatingModule] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [moduleForm, setModuleForm] = useState<ModuleFormState>({ title: '', description: '' })
  const [lessonDialog, setLessonDialog] = useState<{ moduleId: string | null; lesson?: Lesson | null }>({ moduleId: null, lesson: null })
  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    title: '',
    description: '',
    content: '',
    videoUrl: '',
    videoStorage: null,
    videoDuration: '',
    isFree: false,
  })
  const videoFileInputRef = useRef<HTMLInputElement | null>(null)
  const assetFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  const [videoUploading, setVideoUploading] = useState(false)
  const [assetUploadingLessonId, setAssetUploadingLessonId] = useState<string | null>(null)
  const [assetDeletingId, setAssetDeletingId] = useState<string | null>(null)

  const formatFileSize = (size?: number | null) => {
    if (!size || size <= 0) return ''
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploadMedia = async (file: File, type: 'course-videos' | 'lesson-assets') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      try {
        const error = await response.json()
        throw new Error(error?.message || 'Erro ao enviar arquivo')
      } catch (err) {
        if (err instanceof Error && err.message !== 'Erro ao enviar arquivo') {
          throw err
        }
        throw new Error('Erro ao enviar arquivo')
      }
    }

    const data = await response.json()
    return data as { url: string; filename: string; size?: number; type?: string }
  }

  const fetchContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/courses/${courseId}/content`)
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao carregar conteúdo')
      }
      setData(json)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar conteúdo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const resetModuleForm = () => {
    setModuleForm({ title: '', description: '' })
    setCreatingModule(false)
    setEditingModule(null)
  }

  const handleCreateModule = async () => {
    try {
      if (!moduleForm.title.trim()) {
        toast.error('Informe um título para o módulo')
        return
      }

      const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || undefined,
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao criar módulo')
      }

      toast.success('Módulo criado com sucesso')
      resetModuleForm()
      fetchContent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar módulo')
    }
  }

  const handleUpdateModule = async () => {
    if (!editingModule) return
    try {
      if (!moduleForm.title.trim()) {
        toast.error('Informe um título para o módulo')
        return
      }

      const response = await fetch(`/api/admin/courses/${courseId}/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao atualizar módulo')
      }

      toast.success('Módulo atualizado com sucesso')
      resetModuleForm()
      fetchContent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar módulo')
    }
  }

  const handleDeleteModule = async (module: Module) => {
    if (!confirm(`Deseja realmente remover o módulo "${module.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${module.id}`, {
        method: 'DELETE',
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao remover módulo')
      }

      toast.success('Módulo removido')
      fetchContent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover módulo')
    }
  }

  const openLessonDialog = (moduleId: string, lesson?: Lesson) => {
    setLessonDialog({ moduleId, lesson })
    setLessonForm({
      id: lesson?.id,
      title: lesson?.title ?? '',
      description: lesson?.description ?? '',
      content: lesson?.content ?? '',
      videoUrl: lesson?.videoUrl ?? '',
      videoStorage: lesson?.videoStorage ?? null,
      videoDuration: lesson?.videoDuration != null ? String(lesson.videoDuration) : '',
      isFree: lesson?.isFree ?? false,
    })
  }

  const closeLessonDialog = () => {
    setLessonDialog({ moduleId: null, lesson: null })
    setLessonForm({
      title: '',
      description: '',
      content: '',
      videoUrl: '',
      videoStorage: null,
      videoDuration: '',
      isFree: false,
    })
  }

  const handleSaveLesson = async () => {
    if (!lessonDialog.moduleId) return

    if (!lessonForm.title.trim()) {
      toast.error('Informe um título para a aula')
      return
    }

    const trimmedVideoUrl = lessonForm.videoUrl.trim()
    const hasVideo = trimmedVideoUrl.length > 0

    const payload: Record<string, unknown> = {
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim() || undefined,
      content: lessonForm.content.trim() || undefined,
      videoDuration: lessonForm.videoDuration ? Number(lessonForm.videoDuration) : undefined,
      isFree: lessonForm.isFree,
    }

    if (lessonForm.id) {
      payload.videoUrl = hasVideo ? trimmedVideoUrl : null
      payload.videoStorage = hasVideo ? lessonForm.videoStorage ?? null : null
    } else if (hasVideo) {
      payload.videoUrl = trimmedVideoUrl
      payload.videoStorage = lessonForm.videoStorage ?? null
    }

    try {
      let response: Response
      if (lessonForm.id) {
        response = await fetch(`/api/admin/courses/${courseId}/modules/${lessonDialog.moduleId}/lessons/${lessonForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`/api/admin/courses/${courseId}/modules/${lessonDialog.moduleId}/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao salvar aula')
      }

      toast.success(`Aula ${lessonForm.id ? 'atualizada' : 'criada'} com sucesso`)
      closeLessonDialog()
      fetchContent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar aula')
    }
  }

  const handleDeleteLesson = async (moduleId: string, lesson: Lesson) => {
    if (!confirm(`Deseja remover a aula "${lesson.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
        method: 'DELETE',
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao remover aula')
      }

      toast.success('Aula removida')
      fetchContent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover aula')
    }
  }

  const handleLessonVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Selecione um vídeo nos formatos MP4, WEBM, OGG ou MOV.')
      return
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('O vídeo deve ter no máximo 200MB.')
      return
    }

    try {
      setVideoUploading(true)
      const uploaded = await uploadMedia(file, 'course-videos')
      setLessonForm((prev) => ({
        ...prev,
        videoUrl: uploaded.url ?? '',
        videoStorage: {
          url: uploaded.url,
          filename: uploaded.filename ?? file.name,
          size: uploaded.size ?? file.size,
          type: uploaded.type ?? file.type
        }
      }))
      toast.success('Vídeo enviado com sucesso')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar o vídeo'
      toast.error(message)
    } finally {
      setVideoUploading(false)
    }
  }

  const handleLessonVideoRemove = () => {
    setLessonForm((prev) => ({
      ...prev,
      videoUrl: '',
      videoStorage: null
    }))
  }

  const handleAssetFileChange = async (moduleId: string, lesson: Lesson, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const isAllowed =
      ACCEPTED_ASSET_TYPES.includes(file.type) ||
      ACCEPTED_VIDEO_TYPES.includes(file.type) ||
      file.type.startsWith('image/')

    if (!isAllowed) {
      toast.error('Formato de arquivo não suportado para materiais da aula.')
      return
    }

    if (file.size > MAX_ASSET_SIZE) {
      toast.error('O material deve ter no máximo 50MB.')
      return
    }

    try {
      setAssetUploadingLessonId(lesson.id)
      const uploaded = await uploadMedia(file, 'lesson-assets')
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          url: uploaded.url,
          type: uploaded.type ?? file.type,
          size: uploaded.size ?? file.size
        })
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || json.message || 'Erro ao adicionar material')
      }

      toast.success('Material adicionado com sucesso')
      fetchContent()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar material'
      toast.error(message)
    } finally {
      setAssetUploadingLessonId(null)
    }
  }

  const handleDeleteAsset = async (moduleId: string, lessonId: string, asset: LessonAsset) => {
    if (!confirm(`Deseja remover o material "${asset.title}"?`)) {
      return
    }

    try {
      setAssetDeletingId(asset.id)
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assets/${asset.id}`, {
        method: 'DELETE'
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Erro ao remover material')
      }

      toast.success('Material removido')
      fetchContent()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao remover material'
      toast.error(message)
    } finally {
      setAssetDeletingId(null)
    }
  }

  const currentVideoFileSize = formatFileSize(lessonForm.videoStorage?.size)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando conteúdo do curso...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Conteúdo do Curso</h2>
              <p className="text-sm text-muted-foreground">Gerencie módulos e aulas do curso. Organize o conteúdo e disponibilize aulas gratuitas.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => {
                setCreatingModule(true)
                setModuleForm({ title: '', description: '' })
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Módulo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {data?.modules.length ? (
          <div className="space-y-3">
            {data.modules.map((module) => (
              <Collapsible key={module.id}>
                <div className="border rounded-lg bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <CollapsibleTrigger asChild>
                      <button className="group flex items-center gap-3 text-lg font-semibold">
                        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                        {module.title}
                      </button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingModule(module)
                          setModuleForm({ title: module.title, description: module.description ?? '' })
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteModule(module)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" onClick={() => openLessonDialog(module.id)} className="ml-2">
                        <Plus className="w-4 h-4 mr-2" /> Aula
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4">
                      {module.description && (
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      )}

                      {module.lessons.length ? (
                        <div className="space-y-3">
                          {module.lessons.map((lesson) => {
                            const lessonAssetInputId = `lesson-asset-${lesson.id}`
                            const videoSizeLabel = formatFileSize(lesson.videoStorage?.size)
                            return (
                              <div key={lesson.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-950">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-muted-foreground">Aula {lesson.order}</span>
                                      {lesson.isFree && (
                                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                          Aula gratuita
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                      {lesson.title}
                                      {lesson.videoUrl && <Video className="w-4 h-4 text-indigo-500" />}
                                    </h4>
                                    {lesson.description && (
                                      <p className="text-sm text-muted-foreground">{lesson.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openLessonDialog(module.id, lesson)}>
                                      <Pencil className="w-4 h-4 mr-2" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLesson(module.id, lesson)}>
                                      <Trash2 className="w-4 h-4 mr-2" /> Remover
                                    </Button>
                                  </div>
                                </div>
                                {lesson.content && (
                                  <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                                    {lesson.content}
                                  </div>
                                )}
                                {lesson.videoUrl && (
                                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <span>Vídeo:</span>
                                      <a
                                        href={lesson.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-300"
                                      >
                                        Ver arquivo
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                    {(lesson.videoStorage?.filename || videoSizeLabel) && (
                                      <div className="flex flex-wrap items-center gap-2">
                                        {lesson.videoStorage?.filename && <span>Arquivo: {lesson.videoStorage.filename}</span>}
                                        {videoSizeLabel && <span>• {videoSizeLabel}</span>}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                      <Paperclip className="w-4 h-4" />
                                      Materiais da aula
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        id={lessonAssetInputId}
                                        type="file"
                                        ref={(element) => {
                                          if (element) {
                                            assetFileInputsRef.current[lesson.id] = element
                                          } else {
                                            delete assetFileInputsRef.current[lesson.id]
                                          }
                                        }}
                                        className="hidden"
                                        onChange={(event) => handleAssetFileChange(module.id, lesson, event)}
                                        disabled={assetUploadingLessonId === lesson.id}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => assetFileInputsRef.current[lesson.id]?.click()}
                                        disabled={assetUploadingLessonId === lesson.id}
                                      >
                                        {assetUploadingLessonId === lesson.id ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enviando...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Adicionar
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  {lesson.assets.length ? (
                                    <div className="mt-3 space-y-2">
                                      {lesson.assets.map((asset) => {
                                        const assetSize = formatFileSize(asset.size)
                                        return (
                                          <div
                                            key={asset.id}
                                            className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
                                          >
                                            <div className="space-y-1">
                                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {asset.title}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {assetSize ? `${assetSize} • ` : ''}
                                                {asset.type || 'Arquivo'}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <a
                                                href={asset.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-indigo-600 hover:underline dark:text-indigo-300"
                                              >
                                                Abrir
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteAsset(module.id, lesson.id, asset)}
                                                disabled={assetDeletingId === asset.id}
                                              >
                                                {assetDeletingId === asset.id ? (
                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                  <>
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Remover
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                      Nenhum material anexado ainda. Faça upload de apostilas, PDFs, apresentações ou recursos extras.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                          Nenhuma aula cadastrada neste módulo ainda. Adicione sua primeira aula.
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum módulo cadastrado ainda.
              <div className="mt-4">
                <Button onClick={() => setCreatingModule(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Criar primeiro módulo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Module Dialog */}
      <Dialog open={creatingModule || !!editingModule} onOpenChange={(open) => !open && resetModuleForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Editar módulo' : 'Novo módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Título do módulo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição breve sobre este módulo (opcional)"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={resetModuleForm}>Cancelar</Button>
              <Button onClick={editingModule ? handleUpdateModule : handleCreateModule}>
                {editingModule ? 'Salvar alterações' : 'Criar módulo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={!!lessonDialog.moduleId} onOpenChange={(open) => !open && closeLessonDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lessonForm.id ? 'Editar aula' : 'Nova aula'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Título da aula"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vídeo da aula</label>
                <Input
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={videoUploading}
                  >
                    {videoUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Fazer upload
                      </>
                    )}
                  </Button>
                  {lessonForm.videoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLessonVideoRemove}
                      disabled={videoUploading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover vídeo
                    </Button>
                  )}
                </div>
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept={ACCEPTED_VIDEO_TYPES.join(',')}
                  className="hidden"
                  onChange={handleLessonVideoFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Cole uma URL externa ou envie o arquivo (MP4, WEBM, OGG ou MOV — até 200MB).
                </p>
                {lessonForm.videoStorage?.filename && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo atual: {lessonForm.videoStorage.filename}
                    {currentVideoFileSize ? ` (${currentVideoFileSize})` : ''}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duração do vídeo (minutos)</label>
                <Input
                  type="number"
                  min={0}
                  value={lessonForm.videoDuration}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, videoDuration: e.target.value }))}
                  placeholder="ex: 15"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Resumo da aula"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo detalhado</label>
              <Textarea
                value={lessonForm.content}
                onChange={(e) => setLessonForm((prev) => ({ ...prev, content: e.target.value }))}
                rows={6}
                placeholder="Conteúdo completo da aula"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="lesson-free"
                checked={lessonForm.isFree}
                onCheckedChange={(checked) => setLessonForm((prev) => ({ ...prev, isFree: Boolean(checked) }))}
              />
              <label htmlFor="lesson-free" className="text-sm text-muted-foreground">
                Esta aula é gratuita (acesso aberto sem compra)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeLessonDialog}>Cancelar</Button>
              <Button onClick={handleSaveLesson}>
                {lessonForm.id ? 'Salvar alterações' : 'Criar aula'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
