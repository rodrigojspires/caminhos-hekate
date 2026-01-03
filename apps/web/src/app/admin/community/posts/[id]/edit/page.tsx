'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PostEditor } from '@/components/dashboard/community/PostEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Category = { id: string; name: string; description: string; color: string }
type Community = { id: string; name: string }

export default function EditCommunityPostPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [postRes, topicsRes, communitiesRes] = await Promise.all([
          fetch(`/api/admin/community/posts/${params.id}`, { cache: 'no-store' }),
          fetch('/api/admin/community/topics?limit=200', { cache: 'no-store' }),
          fetch('/api/admin/communities?limit=200', { cache: 'no-store' })
        ])

        if (!postRes.ok) {
          throw new Error('Post não encontrado')
        }

        const post = await postRes.json()
        const topicsData = topicsRes.ok ? await topicsRes.json() : { topics: [] }
        const communitiesData = communitiesRes.ok ? await communitiesRes.json() : { communities: [] }

        const cats = Array.isArray(topicsData?.topics)
          ? topicsData.topics.map((t: any) => ({
              id: t.id,
              name: t.name,
              description: t.description || '',
              color: t.color || '#6B7280'
            }))
          : []
        const comms = Array.isArray(communitiesData?.communities)
          ? communitiesData.communities.map((c: any) => ({ id: c.id, name: c.name }))
          : []

        setCategories(cats)
        setCommunities(comms)
        setInitialData({
          title: post.title || '',
          content: post.content || '',
          category: post.topic?.id || '',
          communityIds: post.communityId ? [post.communityId] : [],
          isDraft: post.status === 'DRAFT',
          isPinned: !!post.isPinned,
          isFeatured: !!post.metadata?.featured,
          allowComments: post.allowComments !== false
        })
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao carregar post')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

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
        communityIds: data.communityIds || [],
        allowComments: data.allowComments !== false,
        metadata: {
          featured: !!data.isFeatured
        }
      }
      const res = await fetch(`/api/admin/community/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao atualizar post')
      }
      toast.success('Post atualizado com sucesso')
      router.push('/admin/community/posts')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar post')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Editar Post</CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    )
  }

  if (!initialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Editar Post</CardTitle>
        </CardHeader>
        <CardContent>Post não encontrado.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editar Post</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>
      <PostEditor
        categories={categories}
        communities={communities}
        initialData={initialData}
        isEditing
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </div>
  )
}
