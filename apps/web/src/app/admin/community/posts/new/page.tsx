'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PostEditor } from '@/components/dashboard/community/PostEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Category = { id: string; name: string; description: string; color: string }

export default function NewCommunityPostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/community/topics?limit=100', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const cats = Array.isArray(data?.topics)
            ? data.topics.map((t: any) => ({ id: t.id, name: t.name, description: t.description || '', color: t.color || '#6B7280' }))
            : []
          setCategories(cats)
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
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </div>
  )
}
