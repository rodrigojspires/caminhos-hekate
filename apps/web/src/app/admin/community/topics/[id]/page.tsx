import Link from 'next/link'
import { headers } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit } from 'lucide-react'

async function getTopic(id: string) {
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = envBaseUrl || (host ? `${proto}://${host}` : 'http://localhost:3000')
  const res = await fetch(`${baseUrl}/api/admin/community/topics/${id}`, {
    cache: 'no-store',
    headers: { cookie: headersList.get('cookie') ?? '' }
  })
  if (!res.ok) return null
  return res.json()
}

export default async function TopicDetailsPage({ params }: { params: { id: string } }) {
  const topic = await getTopic(params.id)

  if (!topic) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/admin/community/topics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Categoria não encontrada.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/community/topics">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{topic.name}</h1>
            <p className="text-muted-foreground">Detalhes da categoria</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/community/topics/${topic.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
          <CardDescription>Dados principais da categoria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Comunidade</p>
              <p className="font-medium">{topic.community?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-medium">{topic.slug}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cor</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: topic.color || '#8B5CF6' }} />
                <span className="text-sm">{topic.color || '#8B5CF6'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posts</p>
              <Badge variant="outline">{topic._count?.posts || 0} posts</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <p className="mt-1">{topic.description || 'Sem descrição'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
