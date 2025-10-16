'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Video, Edit2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface Lesson {
  id: string
  title: string
  description?: string | null
  content?: string | null
  videoUrl?: string | null
  videoDuration?: number | null
  order: number
  isFree: boolean
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
    videoDuration: '',
    isFree: false,
  })

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

    const payload = {
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim() || undefined,
      content: lessonForm.content.trim() || undefined,
      videoUrl: lessonForm.videoUrl.trim() || undefined,
      videoDuration: lessonForm.videoDuration ? Number(lessonForm.videoDuration) : undefined,
      isFree: lessonForm.isFree,
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
                          {module.lessons.map((lesson) => (
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
                                <div className="mt-3">
                                  <p className="text-xs text-muted-foreground">
                                    Vídeo: {lesson.videoUrl}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
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
                <label className="text-sm font-medium">Video URL</label>
                <Input
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://..."
                />
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
