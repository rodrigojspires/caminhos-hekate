import Link from 'next/link'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import NestedComments from '@/components/public/community/NestedComments'
import FollowToggle from '@/components/public/community/FollowToggle'
import PostViewTracker from '@/components/public/community/PostViewTracker'

export default async function CommunityPostPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null
  const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } }) : null
  const userTier = dbUser?.subscriptionTier || 'FREE'
  const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
    include: { author: { select: { id: true, name: true } }, topic: { select: { id: true, name: true } } }
  })
  if (!post || post.status !== 'PUBLISHED') return <div className="container mx-auto py-12">Post não encontrado</div>
  const locked = order[userTier] < order[post.tier as keyof typeof order]

  return (
    <main className="container mx-auto py-8 max-w-3xl">
      <PostViewTracker postId={post.id} />
      <div className="text-sm text-muted-foreground mb-2">
        <Link href="/comunidade/feed" className="hover:underline">← Voltar ao feed</Link>
      </div>
      <h1 className="text-2xl font-semibold">{post.title}</h1>
      <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
        <div>
          Por {post.author.name} • {new Date(post.createdAt).toLocaleDateString('pt-BR')} {post.topic && <>• {post.topic.name}</>}
        </div>
        <div className="flex items-center gap-2">
          {/* Follow author */}
          <FollowToggle type="author" id={post.author.id} />
          {post.topic && <FollowToggle type="topic" id={post.topic.id} />}
        </div>
      </div>
      {locked ? (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm">Este conteúdo requer o nível {post.tier}. <Link href="/precos" className="underline text-primary">Faça upgrade</Link> para acessar o conteúdo completo.</p>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground mt-2">Prévia: {post.excerpt}</p>
          )}
        </div>
      ) : (
        <article className="prose prose-sm dark:prose-invert mt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </article>
      )}

      {/* Comentários */}
      <NestedComments postId={post.id} locked={locked} />
    </main>
  )
}
