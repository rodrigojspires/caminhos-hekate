import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Pin } from 'lucide-react'

async function getPost(postId: string) {
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = envBaseUrl || (host ? `${proto}://${host}` : 'http://localhost:3000')
  const response = await fetch(`${baseUrl}/api/admin/community/posts/${postId}`, {
    cache: 'no-store',
    headers: {
      cookie: headersList.get('cookie') ?? ''
    }
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return <Badge variant="default">Publicado</Badge>
    case 'DRAFT':
      return <Badge variant="secondary">Rascunho</Badge>
    case 'HIDDEN':
      return <Badge variant="destructive">Oculto</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function AdminCommunityPostPage({
  params
}: {
  params: { id: string }
}) {
  const post = await getPost(params.id)

  if (!post) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/community/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{post.title}</h1>
            <p className="text-sm text-muted-foreground">
              Post da comunidade {post.community?.name || post.communityId || '—'}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/community/posts/${post.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Detalhes do post
            {post.isPinned ? <Pin className="h-4 w-4 text-muted-foreground" /> : null}
          </CardTitle>
          <CardDescription>Resumo do conteúdo e metadados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {getStatusLabel(post.status)}
            {post.metadata?.featured ? (
              <Badge variant="outline">Destaque</Badge>
            ) : null}
            {post.allowComments === false ? (
              <Badge variant="outline">Comentários desativados</Badge>
            ) : null}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Autor: {post.author?.name || 'Usuário'}</p>
            <p>Categoria: {post.topic?.name || 'Geral'}</p>
          </div>

          <div className="rounded-md border p-4">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
