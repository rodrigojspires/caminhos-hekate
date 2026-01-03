"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Edit, Eye, FileText, MessageSquare, Tag, Trash2 } from 'lucide-react'

const accessOptions = [
  { id: 'FREE', label: 'Gratuita' },
  { id: 'SUBSCRIPTION', label: 'Assinatura' },
  { id: 'ONE_TIME', label: 'Compra avulsa' }
]

const tierOptions = ['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']

type Community = {
  id: string
  name: string
  slug: string
  description?: string | null
  accessModels: string[]
  tier: string
  price: number | null
  isActive: boolean
  _count?: {
    memberships: number
    topics: number
    posts: number
    groups: number
  }
}

type Topic = {
  id: string
  name: string
  description?: string | null
  _count?: { posts: number }
}

type Post = {
  id: string
  title: string
  status: string
  author?: { name?: string | null }
  _count?: { comments: number }
}

type CommunityFile = {
  id: string
  title: string
  description?: string | null
  fileUrl: string
  fileType?: string | null
  fileSize?: number | null
  createdAt: string
}

export default function CommunityManagerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const communityId = params.id

  const [community, setCommunity] = useState<Community | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [files, setFiles] = useState<CommunityFile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    accessModels: ['FREE'],
    tier: 'FREE',
    price: '',
    isActive: true
  })
  const [fileForm, setFileForm] = useState({
    title: '',
    description: '',
    fileUrl: '',
    fileType: '',
    fileSize: ''
  })
  const [savingFile, setSavingFile] = useState(false)

  const accessLabel = useMemo(() => {
    if (!community) return ''
    const labels = []
    if (community.accessModels.includes('FREE')) labels.push('Gratuita')
    if (community.accessModels.includes('SUBSCRIPTION')) labels.push(`Assinatura ${community.tier}`)
    if (community.accessModels.includes('ONE_TIME')) labels.push('Compra avulsa')
    return labels.join(' • ')
  }, [community])

  const loadData = async () => {
    try {
      setLoading(true)
      const [communityRes, topicsRes, postsRes, filesRes] = await Promise.all([
        fetch(`/api/admin/communities/${communityId}`, { cache: 'no-store' }),
        fetch(`/api/admin/community/topics?communityId=${communityId}&limit=50`, { cache: 'no-store' }),
        fetch(`/api/admin/community/posts?communityId=${communityId}&limit=20`, { cache: 'no-store' }),
        fetch(`/api/admin/communities/${communityId}/files`, { cache: 'no-store' })
      ])

      if (!communityRes.ok) throw new Error('Falha ao carregar comunidade')

      const communityData = await communityRes.json()
      const topicsData = await topicsRes.json().catch(() => ({ topics: [] }))
      const postsData = await postsRes.json().catch(() => ({ posts: [] }))
      const filesData = await filesRes.json().catch(() => ({ files: [] }))

      setCommunity(communityData)
      setFormData({
        name: communityData.name || '',
        slug: communityData.slug || '',
        description: communityData.description || '',
        accessModels: Array.isArray(communityData.accessModels) ? communityData.accessModels : ['FREE'],
        tier: communityData.tier || 'FREE',
        price: communityData.price != null ? String(communityData.price) : '',
        isActive: !!communityData.isActive
      })
      setSlugTouched(false)
      setTopics(Array.isArray(topicsData.topics) ? topicsData.topics : [])
      setPosts(Array.isArray(postsData.posts) ? postsData.posts : [])
      setFiles(Array.isArray(filesData.files) ? filesData.files : [])
    } catch (error) {
      toast.error('Erro ao carregar dados da comunidade')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (communityId) loadData()
  }, [communityId])

  const handleAddFile = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSavingFile(true)
      const payload = {
        title: fileForm.title,
        description: fileForm.description || undefined,
        fileUrl: fileForm.fileUrl,
        fileType: fileForm.fileType || undefined,
        fileSize: fileForm.fileSize ? Number(fileForm.fileSize) : undefined
      }
      const res = await fetch(`/api/admin/communities/${communityId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao adicionar arquivo')
      }
      toast.success('Arquivo adicionado')
      setFileForm({ title: '', description: '', fileUrl: '', fileType: '', fileSize: '' })
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar arquivo'
      toast.error(message)
    } finally {
      setSavingFile(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/admin/communities/${communityId}/files?fileId=${fileId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Erro ao remover arquivo')
      }
      toast.success('Arquivo removido')
      await loadData()
    } catch (error) {
      toast.error('Erro ao remover arquivo')
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    try {
      const res = await fetch(`/api/admin/community/topics/${topicId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Erro ao excluir categoria')
      }
      toast.success('Categoria excluída')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir categoria')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return
    try {
      const res = await fetch(`/api/admin/community/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Erro ao excluir post')
      }
      toast.success('Post excluído')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir post')
    }
  }

  const handleAccessToggle = (model: string, checked: boolean) => {
    setFormData((prev) => {
      const next = new Set(prev.accessModels)
      if (checked) next.add(model)
      else next.delete(model)
      return { ...prev, accessModels: Array.from(next) }
    })
  }

  const handleNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slug
    }))
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        accessModels: formData.accessModels,
        tier: formData.tier,
        price: formData.price ? Number(formData.price) : null,
        isActive: formData.isActive
      }
      const res = await fetch(`/api/admin/communities/${communityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao atualizar comunidade')
      }
      toast.success('Comunidade atualizada')
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar comunidade'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Comunidade não encontrada.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/community/communities">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/community">Voltar ao painel</Link>
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{community.name}</h1>
          <p className="text-muted-foreground">
            {accessLabel || 'Sem modelo de acesso definido'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Comunidade</CardTitle>
          <CardDescription>Atualize nome, planos e preço da comunidade.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="community-name">Nome</Label>
                <Input
                  id="community-name"
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-slug">Slug</Label>
                <Input
                  id="community-slug"
                  value={formData.slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setFormData((prev) => ({ ...prev, slug: event.target.value }))
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-description">Descrição</Label>
              <Textarea
                id="community-description"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Modelo de acesso</Label>
                <div className="flex flex-col gap-2">
                  {accessOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.accessModels.includes(option.id)}
                        onChange={(event) => handleAccessToggle(option.id, event.target.checked)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tier de assinatura</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.tier}
                  onChange={(event) => setFormData((prev) => ({ ...prev, tier: event.target.value }))}
                >
                  {tierOptions.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Preço mensal (quando pago)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <Label>Comunidade ativa</Label>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Membros</CardDescription>
            <CardTitle>{community._count?.memberships ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Categorias</CardDescription>
            <CardTitle>{community._count?.topics ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Posts</CardDescription>
            <CardTitle>{community._count?.posts ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">
            <Tag className="h-4 w-4 mr-2" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="posts">
            <MessageSquare className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="h-4 w-4 mr-2" />
            Arquivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Categorias desta comunidade</CardTitle>
                <CardDescription>Itens cadastrados no catálogo da comunidade.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/community/topics?communityId=${communityId}`}>
                    Ver todas
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/admin/community/topics/new?communityId=${communityId}`}>
                    Nova categoria
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topics.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topics.map((topic) => (
                      <TableRow key={topic.id}>
                        <TableCell>
                          <div className="font-medium">{topic.name}</div>
                          <div className="text-xs text-muted-foreground">{topic.description || '-'}</div>
                        </TableCell>
                        <TableCell>{topic._count?.posts ?? 0}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/community/topics/${topic.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/community/topics/${topic.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteTopic(topic.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Posts desta comunidade</CardTitle>
                <CardDescription>Conteúdos publicados pelos usuários.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/community/posts?communityId=${communityId}`}>
                    Ver todos
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/admin/community/posts/new?communityId=${communityId}`}>
                    Novo post
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum post encontrado.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comentários</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="font-medium">{post.title}</div>
                          <div className="text-xs text-muted-foreground">{post.author?.name || 'Usuário'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{post.status}</Badge>
                        </TableCell>
                        <TableCell>{post._count?.comments ?? 0}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/community/posts/${post.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/community/posts/${post.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Arquivos da comunidade</CardTitle>
                <CardDescription>Materiais compartilhados.</CardDescription>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum arquivo cadastrado.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="font-medium">{file.title}</div>
                            <div className="text-xs text-muted-foreground">{file.description || '-'}</div>
                          </TableCell>
                          <TableCell>{file.fileType || '-'}</TableCell>
                          <TableCell>{file.fileSize ? `${file.fileSize} KB` : '-'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button asChild size="sm" variant="outline">
                              <a href={file.fileUrl} target="_blank" rel="noreferrer">Abrir</a>
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteFile(file.id)}>
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Novo arquivo</CardTitle>
                <CardDescription>Adicione um link para material.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleAddFile}>
                  <div className="space-y-2">
                    <Label htmlFor="file-title">Título</Label>
                    <Input
                      id="file-title"
                      value={fileForm.title}
                      onChange={(event) => setFileForm((prev) => ({ ...prev, title: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file-url">URL</Label>
                    <Input
                      id="file-url"
                      value={fileForm.fileUrl}
                      onChange={(event) => setFileForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file-description">Descrição</Label>
                    <Textarea
                      id="file-description"
                      value={fileForm.description}
                      onChange={(event) => setFileForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="file-type">Tipo</Label>
                      <Input
                        id="file-type"
                        value={fileForm.fileType}
                        onChange={(event) => setFileForm((prev) => ({ ...prev, fileType: event.target.value }))}
                        placeholder="PDF, Vídeo..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file-size">Tamanho (KB)</Label>
                      <Input
                        id="file-size"
                        type="number"
                        min="0"
                        value={fileForm.fileSize}
                        onChange={(event) => setFileForm((prev) => ({ ...prev, fileSize: event.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingFile}>
                    {savingFile ? 'Salvando...' : 'Adicionar arquivo'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
