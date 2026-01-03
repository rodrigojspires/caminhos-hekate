import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'

async function getComment(commentId: string) {
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = envBaseUrl || (host ? `${proto}://${host}` : 'http://localhost:3000')
  const response = await fetch(`${baseUrl}/api/admin/community/comments/${commentId}`, {
    cache: 'no-store',
    headers: {
      cookie: headersList.get('cookie') ?? ''
    }
  })

  if (!response.ok) return null
  return response.json()
}

export default async function AdminCommunityCommentPage({
  params
}: {
  params: { id: string }
}) {
  const comment = await getComment(params.id)

  if (!comment) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/community/comments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Comentário</h1>
            <p className="text-sm text-muted-foreground">
              Post: {comment.post?.title || '—'}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/community/comments/${comment.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
          <CardDescription>Detalhes do comentário</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Autor: {comment.author?.name || 'Usuário'}
          </p>
          <p className="whitespace-pre-wrap">{comment.content}</p>
        </CardContent>
      </Card>
    </div>
  )
}
