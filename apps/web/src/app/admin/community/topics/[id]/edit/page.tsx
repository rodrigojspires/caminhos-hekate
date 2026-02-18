"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'

type Community = { id: string; name: string }

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function EditTopicPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const topicId = params?.id ?? ''
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#8B5CF6',
    communityId: ''
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [topicRes, communityRes] = await Promise.all([
          fetch(`/api/admin/community/topics/${topicId}`, { cache: 'no-store' }),
          fetch('/api/admin/communities?limit=100', { cache: 'no-store' })
        ])

        if (!topicRes.ok) {
          throw new Error('Falha ao carregar categoria')
        }

        const topicData = await topicRes.json()
        const communityData = await communityRes.json().catch(() => ({}))
        const list = Array.isArray(communityData?.communities)
          ? communityData.communities.map((c: any) => ({ id: c.id, name: c.name }))
          : []

        setCommunities(list)
        setForm({
          name: topicData.name || '',
          slug: topicData.slug || '',
          description: topicData.description || '',
          color: topicData.color || '#8B5CF6',
          communityId: topicData.communityId || ''
        })
      } catch (error) {
        toast.error('Erro ao carregar categoria')
      } finally {
        setLoading(false)
      }
    }
    if (topicId) load()
  }, [topicId])

  const handleSubmit = async () => {
    if (!form.name || !form.description) {
      toast.error('Preencha nome e descrição')
      return
    }
    if (!form.communityId) {
      toast.error('Selecione uma comunidade')
      return
    }
    try {
      setSaving(true)
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        color: form.color,
        communityId: form.communityId
      }
      const res = await fetch(`/api/admin/community/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao atualizar categoria')
      }
      toast.success('Categoria atualizada')
      router.push('/admin/community/topics')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar categoria'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Editar Categoria</CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/community/topics">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Categoria</h1>
          <p className="text-muted-foreground">Atualize os dados da categoria</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Categoria</CardTitle>
          <CardDescription>Atualize os dados principais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({
                ...prev,
                name: event.target.value,
                slug: slugTouched ? prev.slug : slugify(event.target.value)
              }))}
              placeholder="Ex: Tarot"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true)
                setForm((prev) => ({ ...prev, slug: event.target.value }))
              }}
              placeholder="tarot"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descreva sobre o que é esta categoria..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor da Categoria *</Label>
            <div className="flex items-center gap-4">
              <Input
                id="color"
                type="color"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                className="w-20 h-10 p-1 border rounded"
                required
              />
              <Input
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                className="flex-1"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comunidade *</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.communityId}
              onChange={(event) => setForm((prev) => ({ ...prev, communityId: event.target.value }))}
            >
              <option value="">Selecione</option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
