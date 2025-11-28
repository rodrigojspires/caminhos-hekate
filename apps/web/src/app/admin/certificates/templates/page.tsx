'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import {
  Award,
  Plus,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resolveMediaUrl, normalizeMediaPath } from '@/lib/utils'

type TemplateField = {
  key: string
  label?: string
  text?: string
  x: number
  y: number
  fontSize?: number
  color?: string
  align?: 'left' | 'center' | 'right'
  maxWidth?: number
}

type CertificateTemplate = {
  id: string
  name: string
  description?: string | null
  courseId: string | null
  backgroundImageUrl?: string | null
  layout?: {
    fields?: TemplateField[]
    footerText?: string
  } | null
  isDefault: boolean
  isActive: boolean
  course?: { id: string; title: string } | null
  _count?: { certificates: number }
  updatedAt: string
  createdAt: string
}

type CourseOption = { id: string; title: string }

const DEFAULT_FIELDS: TemplateField[] = [
  { key: 'customText', text: 'Escola Iniciática Caminhos de Hekate', x: 50, y: 60, fontSize: 16, align: 'center', maxWidth: 495 },
  { key: 'title', text: 'Certificado de Conclusão', x: 50, y: 100, fontSize: 26, align: 'center', maxWidth: 495 },
  { key: 'userName', label: 'Concedido a', x: 50, y: 170, fontSize: 22, align: 'center', maxWidth: 495 },
  { key: 'courseTitle', label: 'Pela conclusão do curso', x: 50, y: 215, fontSize: 18, align: 'center', maxWidth: 495 },
  { key: 'hours', label: 'Carga horária', x: 50, y: 260, fontSize: 12, align: 'center', maxWidth: 495 },
  { key: 'issuedAt', label: 'Emitido em', x: 50, y: 300, fontSize: 11, align: 'center', maxWidth: 495 },
  { key: 'certificateNumber', label: 'Número do certificado', x: 50, y: 320, fontSize: 11, align: 'center', maxWidth: 495 },
]

const blankField: TemplateField = {
  key: 'customText',
  label: '',
  text: '',
  x: 40,
  y: 40,
  fontSize: 12,
  color: '#111111',
  align: 'left',
  maxWidth: 400
}

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fields, setFields] = useState<TemplateField[]>(() => [...DEFAULT_FIELDS])
  const [form, setForm] = useState({
    name: '',
    description: '',
    backgroundImageUrl: '',
    courseId: '' as string | '',
    isDefault: false,
    isActive: true,
    footerText: 'Valide a autenticidade em caminhosdehekate.com/certificados'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)

  useEffect(() => {
    fetchTemplates()
    fetchCourses()
  }, [])

  useEffect(() => {
    if (!previewRef.current) return
    const measure = () => {
      const width = previewRef.current?.clientWidth || 1
      setPreviewScale(width / 595)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(previewRef.current)
    return () => observer.disconnect()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/certificate-templates')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTemplates(data)
    } catch (error) {
      toast.error('Não foi possível carregar os templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses?limit=50&sortBy=title&sortOrder=asc')
      if (!res.ok) return
      const data = await res.json()
      setCourses(data.courses?.map((course: any) => ({ id: course.id, title: course.title })) || [])
    } catch (error) {
      // Não bloquear a tela se a lista de cursos não carregar
    }
  }

  const resetForm = (hideForm: boolean = false) => {
    setEditingId(null)
    setFields(() => [...DEFAULT_FIELDS])
    setForm({
      name: '',
      description: '',
      backgroundImageUrl: '',
      courseId: '',
      isDefault: false,
      isActive: true,
      footerText: 'Valide a autenticidade em caminhosdehekate.com/certificados'
    })
    if (hideForm) setShowForm(false)
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      const payload = {
        name: form.name,
        description: form.description || undefined,
        backgroundImageUrl: form.backgroundImageUrl || undefined,
        courseId: form.courseId || null,
        isDefault: form.isDefault,
        isActive: form.isActive,
        layout: {
          fields,
          footerText: form.footerText || undefined
        }
      }

      const method = editingId ? 'PUT' : 'POST'
      const url = editingId
        ? `/api/admin/certificate-templates/${editingId}`
        : '/api/admin/certificate-templates'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error?.error || 'Erro ao salvar template')
      }

      toast.success(editingId ? 'Template atualizado' : 'Template criado')
      resetForm(true)
      fetchTemplates()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar template')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (template: CertificateTemplate) => {
    setEditingId(template.id)
    setFields(template.layout?.fields ? [...template.layout.fields] : [...DEFAULT_FIELDS])
    setForm({
      name: template.name,
      description: template.description || '',
      backgroundImageUrl: template.backgroundImageUrl || '',
      courseId: template.courseId || '',
      isDefault: template.isDefault,
      isActive: template.isActive,
      footerText: template.layout?.footerText || 'Valide a autenticidade em caminhosdehekate.com/certificados'
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Remover este template?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/certificate-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Template removido')
      if (editingId === id) resetForm(true)
      fetchTemplates()
    } catch (error) {
      toast.error('Erro ao remover template')
    }
  }

  const updateField = (index: number, key: keyof TemplateField, value: string | number) => {
    setFields((prev) =>
      prev.map((field, idx) => {
        if (idx !== index) return field
        if (key === 'x' || key === 'y' || key === 'fontSize' || key === 'maxWidth') {
          const numericValue = value === '' ? undefined : Number(value)
          return { ...field, [key]: numericValue as any }
        }
        return { ...field, [key]: value }
      })
    )
  }

  const fieldPreview = useMemo(
    () =>
      fields.map((field) => ({
        ...field,
        summary: field.text
          ? field.text
          : field.label
          ? `${field.label}: ${field.key}`
          : field.key
      })),
    [fields]
  )

  const uploadBackground = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'course-images')
    setUploadingBg(true)
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error?.message || 'Erro ao enviar imagem')
      }
      const data = await res.json()
      const url = data.url as string
      setForm((prev) => ({ ...prev, backgroundImageUrl: url }))
      toast.success('Imagem de fundo enviada')
    } catch (error: any) {
      toast.error(error?.message || 'Erro no upload')
    } finally {
      setUploadingBg(false)
    }
  }

  const handleBackgroundFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadBackground(file)
    e.target.value = ''
  }

  const backgroundPreview = useMemo(
    () => resolveMediaUrl(normalizeMediaPath(form.backgroundImageUrl || '')),
    [form.backgroundImageUrl]
  )

  const previewFieldValue = (field: TemplateField) => {
    if (field.text) return field.text
    if (field.label) return `${field.label}: ${field.key}`
    return field.key
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Templates de Certificado
          </h1>
          <p className="text-muted-foreground">
            Configure modelos diferentes por curso, com imagem de fundo e posicionamento dos campos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            variant="secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo template
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Editar template' : 'Novo template'}</CardTitle>
              <CardDescription>
                Defina um fundo e organize os campos (nome, curso, horas, data, número do certificado). Use {`{customText}`} para adicionar selos ou assinaturas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do template</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Certificado clássico, Certificado premium..."
                />
              </div>

              <div className="space-y-2">
                <Label>Curso (opcional)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={form.courseId}
                  onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
                >
                  <option value="">Aplicar como padrão global</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Imagem de fundo (URL) ou upload</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      value={form.backgroundImageUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, backgroundImageUrl: e.target.value }))}
                      placeholder="https://... ou /uploads/course-images/arquivo.jpg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingBg}
                    >
                      {uploadingBg ? 'Enviando...' : 'Upload'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBackgroundFileChange}
                    />
                  </div>
                  {backgroundPreview && (
                    <p className="text-xs text-muted-foreground">
                      Pré-visualização abaixo usa a imagem e as coordenadas informadas.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição interna</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Notas internas ou instruções para quem for editar."
                />
              </div>

              <div className="space-y-2">
                <Label>Rodapé</Label>
                <Input
                  value={form.footerText}
                  onChange={(e) => setForm((prev) => ({ ...prev, footerText: e.target.value }))}
                  placeholder="Texto de validação ou link de autenticidade."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isDefault}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isDefault: checked }))}
                  />
                  <Label>Definir como padrão para este curso</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Campos</p>
                  <p className="text-xs text-muted-foreground">
                    Ajuste posições (x, y) em pixels para o PDF A4. Alinhe conforme o design do fundo.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFields((prev) => [...prev, { ...blankField, key: `custom-${prev.length + 1}` }])}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar campo
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="grid gap-3 md:grid-cols-6 items-end border rounded-md p-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label>Campo</Label>
                      <Input
                        value={field.key}
                        onChange={(e) => updateField(index, 'key', e.target.value)}
                        placeholder="userName, courseTitle, issuedAt..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Label</Label>
                      <Input
                        value={field.label || ''}
                        onChange={(e) => updateField(index, 'label', e.target.value)}
                        placeholder="Ex.: Concedido a"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Texto fixo</Label>
                      <Input
                        value={field.text || ''}
                        onChange={(e) => updateField(index, 'text', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Fonte</Label>
                      <Input
                        type="number"
                        value={field.fontSize || ''}
                        onChange={(e) => updateField(index, 'fontSize', e.target.value)}
                        placeholder="14"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Alinhamento</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 bg-background"
                        value={field.align || 'left'}
                        onChange={(e) => updateField(index, 'align', e.target.value)}
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centralizado</option>
                        <option value="right">Direita</option>
                      </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Cor</Label>
                      <Input
                        value={field.color || ''}
                        onChange={(e) => updateField(index, 'color', e.target.value)}
                        placeholder="#111111"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>X</Label>
                      <Input
                        type="number"
                        value={field.x}
                        onChange={(e) => updateField(index, 'x', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Y</Label>
                      <Input
                        type="number"
                        value={field.y}
                        onChange={(e) => updateField(index, 'y', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Largura</Label>
                      <Input
                        type="number"
                        value={field.maxWidth || ''}
                        onChange={(e) => updateField(index, 'maxWidth', e.target.value)}
                        placeholder="500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>&nbsp;</Label>
                      <Button
                        variant="ghost"
                        className="w-full text-red-600 hover:text-red-700"
                        onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== index))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => resetForm(true)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saving || !form.name}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Cadastre ou edite um template</CardTitle>
              <CardDescription>Selecione um template na lista ao lado ou clique em “Novo template”.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Nenhum template selecionado.</p>
                <Button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>Visual e listagem dos campos com as coordenadas aplicadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                ref={previewRef}
                className="relative w-full aspect-[210/297] border rounded-md overflow-hidden bg-muted"
              >
                {backgroundPreview && (
                  <img
                    src={backgroundPreview}
                    alt="Fundo do certificado"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {fields.map((field, index) => {
                  const left = (field.x || 0) * previewScale
                  const top = (field.y || 0) * previewScale
                  const width = (field.maxWidth || 495) * previewScale
                  const fontSize = (field.fontSize || 14) * previewScale
                  const textAlign = field.align || 'left'
                  return (
                    <div
                      key={`${field.key}-${index}-preview`}
                      className="absolute"
                      style={{
                        left,
                        top,
                        width,
                        fontSize,
                        color: field.color || '#111',
                        textAlign
                      }}
                    >
                      {previewFieldValue(field)}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                A área acima usa escala relativa ao PDF A4 (595x842pt). Ajuste X/Y para posicionar com precisão.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {fieldPreview.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="border rounded-md p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{field.key}</span>
                      <Badge variant="secondary">{field.align || 'left'}</Badge>
                    </div>
                    <p className="text-muted-foreground">{field.summary}</p>
                    <p className="text-xs text-muted-foreground">Posição: {field.x}px / {field.y}px • Fonte: {field.fontSize || 14}px</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Templates existentes</CardTitle>
              <CardDescription>Gerencie padrões por curso e acompanhe uso.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {template.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.course ? (
                          <span>{template.course.title}</span>
                        ) : (
                          <Badge variant="outline">Padrão global</Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {template.isActive ? (
                            <Badge variant="secondary">Ativo</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                          )}
                          {template.isDefault && <Badge variant="default">Padrão</Badge>}
                          {template._count?.certificates ? (
                            <Badge variant="outline">{template._count.certificates} certificados</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(template.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(template.id)}
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!templates.length && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum template cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
