'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PostEditor } from '@/components/dashboard/community/PostEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Category = { id: string; name: string; description: string; color: string }
type Community = { id: string; name: string }

export default function NewCommunityPostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [communities, setCommunities] = useState<Community[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [topicsRes, communitiesRes] = await Promise.all([
          fetch('/api/admin/community/topics?limit=100', { cache: 'no-store' }),
          fetch('/api/admin/communities?limit=100', { cache: 'no-store' })
        ])
        if (topicsRes.ok) {
          const data = await topicsRes.json()
          const cats = Array.isArray(data?.topics)
            ? data.topics.map((t: any) => ({ id: t.id, name: t.name, description: t.description || '', color: t.color || '#6B7280' }))
            : []
          setCategories(cats)
        }
        if (communitiesRes.ok) {
          const data = await communitiesRes.json()
          const list = Array.isArray(data?.communities)
            ? data.communities.map((c: any) => ({ id: c.id, name: c.name }))
            : []
          setCommunities(list)
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async (data: any) => {
    try {
      const body = {
        title: data.title,
        content: data.content,
        slug: data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        topicId: data.category || undefined,
        status: data.isDraft ? 'DRAFT' : 'PUBLISHED',
        excerpt: data.content?.slice(0, 180) || undefined,
        tier: 'FREE',
        isPinned: data.isPinned || false,
        communityIds: data.communityIds || []
      }
      const res = await fetch('/api/admin/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao criar post')
      }
      const created = await res.json()
      toast.success('Post criado com sucesso')
      router.push(`/admin/community/posts/${created.id}`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar post')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Novo Post</CardTitle>
        </CardHeader>
        <CardContent>
          Carregando...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Novo Post</h1>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
      <PostEditor
        categories={categories}
        communities={communities}
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </div>
  )
}
