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
import { ArrowLeft, FileText, MessageSquare, Tag } from 'lucide-react'

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
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/community/communities">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{community.name}</h1>
          <p className="text-muted-foreground">
            {accessLabel || 'Sem modelo de acesso definido'}
          </p>
        </div>
      </div>

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
        <Card>
          <CardHeader>
            <CardDescription>Grupos</CardDescription>
            <CardTitle>{community._count?.groups ?? 0}</CardTitle>
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
              <Button asChild size="sm">
                <Link href={`/admin/community/topics/new?communityId=${communityId}`}>
                  Nova categoria
                </Link>
              </Button>
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
              <Button asChild size="sm">
                <Link href={`/admin/community/posts/new?communityId=${communityId}`}>
                  Novo post
                </Link>
              </Button>
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
