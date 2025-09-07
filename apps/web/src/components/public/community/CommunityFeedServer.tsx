import Link from 'next/link'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CommunityFeedClient from '@/components/public/community/CommunityFeedClient'

function TierBadge({ tier }: { tier: string }) {
  const color = tier === 'SACERDOCIO' ? 'bg-purple-100 text-purple-700' : tier === 'ADEPTO' ? 'bg-blue-100 text-blue-700' : tier === 'INICIADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{tier}</span>
}

export default async function CommunityFeedServer({ filter, basePath }: { filter?: string; basePath: string }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null
  const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } }) : null
  const userTier = dbUser?.subscriptionTier || 'FREE'
  const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

  let where: any = { status: 'PUBLISHED' }
  if (filter === 'following' && userId) {
    const prefs = await prisma.userPreferences.findUnique({ where: { userId }, select: { layout: true } })
    const layout = (prefs?.layout as any) || {}
    const community = layout.community || {}
    const topics: string[] = community.followedTopics || []
    const authors: string[] = community.followedAuthors || []
    where = {
      status: 'PUBLISHED',
      OR: [
        topics.length ? { topicId: { in: topics } } : undefined as any,
        authors.length ? { authorId: { in: authors } } : undefined as any
      ].filter(Boolean)
    }
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 20,
    include: {
      author: { select: { id: true, name: true, image: true } },
      topic: { select: { id: true, name: true, slug: true, color: true } },
      _count: { select: { comments: true, reactions: true } }
    }
  })

  const initial = posts.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: order[userTier] < order[p.tier as keyof typeof order] ? null : p.content,
    createdAt: p.createdAt.toISOString(),
    commentsCount: p._count.comments,
    reactionsCount: p._count.reactions,
    topic: p.topic ? { id: p.topic.id, name: p.topic.name, slug: p.topic.slug, color: p.topic.color } : null,
    tier: p.tier,
    locked: order[userTier] < order[p.tier as keyof typeof order]
  }))

  return (
    <section className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Feed da Comunidade</h1>
        <div className="text-sm text-muted-foreground">Seu nível: <TierBadge tier={userTier} /></div>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link href={`${basePath}`}{...(!filter ? {} : {})} className={!filter ? 'underline' : ''}>Todos</Link>
        <span>•</span>
        <Link href={`${basePath}?filter=following`} className={filter === 'following' ? 'underline' : ''}>Seguindo</Link>
      </div>

      <CommunityFeedClient initial={initial} filter={filter} />
    </section>
  )
}

