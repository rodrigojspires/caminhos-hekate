"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Post = {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  content?: string | null
  createdAt: string
  commentsCount: number
  reactionsCount?: number
  topic?: { id: string; name: string; slug: string; color?: string | null } | null
  tier: string
  locked: boolean
}

export default function CommunityFeedClient({ initial, filter }: { initial: Post[]; filter?: string }) {
  const [posts, setPosts] = useState<Post[]>(initial)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const [topicId, setTopicId] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [topics, setTopics] = useState<Array<{ id: string; name: string }>>([])
  const [authors, setAuthors] = useState<Array<{ id: string; name: string }>>([])

  const fetchPage = useCallback(async (nextPage: number, replace = false) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    params.set('limit', '10')
    if (filter === 'following') params.set('filter', 'following')
    if (topicId) params.set('topicId', topicId)
    if (authorId) params.set('authorId', authorId)
    const res = await fetch(`/api/community/posts?${params}`)
    const j = await res.json()
    const newPosts = j.posts as Post[]
    setHasMore(newPosts.length >= 10)
    setPosts(prev => replace ? newPosts : [...prev, ...newPosts])
    setLoading(false)
  }, [filter, topicId, authorId])

  useEffect(() => {
    // Carregar listas de tópicos e autores
    fetch('/api/community/topics').then(async (r) => {
      const j = await r.json().catch(() => ({ topics: [] }))
      setTopics(j.topics || [])
    }).catch(() => {})
    fetch('/api/community/authors').then(async (r) => {
      const j = await r.json().catch(() => ({ authors: [] }))
      setAuthors(j.authors || [])
    }).catch(() => {})
  }, [])

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !loading && hasMore) {
          setPage((prev) => {
            const next = prev + 1
            fetchPage(next)
            return next
          })
        }
      })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading, hasMore, fetchPage])

  // Filters submit
  const applyFilters = async () => {
    setPage(1)
    await fetchPage(1, true)
  }

  return (
    <section className="mt-6">
      <div className="flex gap-2 items-end mb-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Tópico</label>
          <Select value={topicId} onValueChange={(v) => setTopicId(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os tópicos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tópicos</SelectItem>
              {topics.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Autor</label>
          <Select value={authorId} onValueChange={(v) => setAuthorId(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os autores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os autores</SelectItem>
              {authors.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={applyFilters}>Filtrar</Button>
      </div>
      <div className="space-y-4">
        {posts.map((p) => (
          <article key={p.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {p.topic && (
                  <span className="px-2 py-0.5 rounded bg-gray-100">{p.topic.name}</span>
                )}
                <span>•</span>
                <span>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{p.tier}</span>
            </div>
            <h2 className="text-lg font-medium mt-2">
              <Link href={`/comunidade/post/${p.slug}`} className="hover:underline">{p.title}</Link>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{p.locked ? (p.excerpt || 'Conteúdo disponível para membros.') : (p.excerpt || p.content?.slice(0, 200))}</p>
            <div className="mt-2 text-xs text-muted-foreground">{p.commentsCount} comentários • {p.reactionsCount ?? 0} reações</div>
          </article>
        ))}
      </div>
      <div ref={loaderRef} className="h-8 flex items-center justify-center text-xs text-muted-foreground mt-4">
        {loading ? 'Carregando...' : (hasMore ? 'Role para carregar mais' : 'Fim do feed')}
      </div>
    </section>
  )
}
