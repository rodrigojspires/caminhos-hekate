"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'

type Community = { id: string; name: string; slug: string }

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

export default function NewTopicPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#8B5CF6',
    isActive: true,
    communityIds: [] as string[]
  })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/communities?limit=100', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data?.communities)
            ? data.communities.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug }))
            : []
          setCommunities(list)
        }
      } catch (e) {
        toast.error('Erro ao carregar comunidades')
      }
    }
    load()
  }, [])

  const previewName = form.name || 'Nome do Tópico'
  const previewDescription = form.description || 'A descrição do tópico aparecerá aqui...'

  const accessLabel = useMemo(() => {
    if (form.communityIds.length === 0) return 'Selecione ao menos uma comunidade'
    return `${form.communityIds.length} comunidade(s) selecionada(s)`
  }, [form.communityIds])

  const handleSubmit = async () => {
    if (!form.name || !form.description) {
      toast.error('Preencha nome e descrição')
      return
    }
    if (form.communityIds.length === 0) {
      toast.error('Selecione ao menos uma comunidade')
      return
    }
    try {
      setSaving(true)
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        color: form.color,
        communityIds: form.communityIds
      }
      const res = await fetch('/api/admin/community/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao criar tópico')
      }
      toast.success('Tópico criado com sucesso')
      router.push('/admin/community/topics')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar tópico'
      toast.error(message)
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Novo Tópico</h1>
          <p className="text-muted-foreground">Criar um novo tópico para a comunidade</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Tópico</CardTitle>
              <CardDescription>Preencha as informações básicas do tópico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Tópico *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                    slug: prev.slug ? prev.slug : slugify(event.target.value)
                  }))}
                  placeholder="Ex: Tarot, Astrologia, Cristais..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="tarot"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Descreva sobre o que é este tópico..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor do Tópico *</Label>
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
                <Label>Comunidades *</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {communities.map((community) => (
                    <label key={community.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.communityIds.includes(community.id)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setForm((prev) => ({
                            ...prev,
                            communityIds: checked
                              ? [...prev.communityIds, community.id]
                              : prev.communityIds.filter((id) => id !== community.id)
                          }))
                        }}
                      />
                      <span>{community.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{accessLabel}</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Tópico ativo</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Como o tópico aparecerá para os usuários</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.color }} />
                  <span className="font-medium">{previewName}</span>
                </div>
                <p className="text-sm text-muted-foreground px-3">{previewDescription}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : 'Criar Tópico'}
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/community/topics">Cancelar</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
