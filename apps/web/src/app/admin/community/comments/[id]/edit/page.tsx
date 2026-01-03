'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function EditCommunityCommentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/community/comments/${params.id}`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Comentário não encontrado')
        }
        const data = await res.json()
        setContent(data.content || '')
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao carregar comentário')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/community/comments/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao atualizar comentário')
      }
      toast.success('Comentário atualizado com sucesso')
      router.push('/admin/community/comments')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar comentário')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Editar Comentário</CardTitle>
        </CardHeader>
        <CardContent>Carregando...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editar Comentário</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Comentário</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar alterações</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
