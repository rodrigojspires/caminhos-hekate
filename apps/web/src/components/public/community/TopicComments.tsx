"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type RawTopicComment = {
  id: string
  content: string
  topicId: string
  author: { id: string; name: string; image?: string | null }
  parentId?: string | null
  createdAt: string
}

type TreeTopicComment = RawTopicComment & { children: TreeTopicComment[] }

export default function TopicComments({ topicId, locked }: { topicId: string; locked?: boolean }) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id as string | undefined
  const currentUserRole = session?.user?.role as string | undefined
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<RawTopicComment[]>([])
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(`/api/community/topics/${topicId}/comments`)
      .then(async (r) => {
        if (!mounted) return
        if (!r.ok) throw new Error('Falha ao carregar comentários')
        const j = await r.json()
        setComments(j.comments || [])
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setError('Não foi possível carregar os comentários')
        setLoading(false)
      })
    return () => { mounted = false }
  }, [topicId])

  const tree = useMemo<TreeTopicComment[]>(() => {
    const map = new Map<string, TreeTopicComment>()
    const roots: TreeTopicComment[] = []
    comments.forEach(c => map.set(c.id, { ...c, children: [] }))
    comments.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(map.get(c.id)!)
      } else {
        roots.push(map.get(c.id)!)
      }
    })
    const sortRec = (arr: TreeTopicComment[]) => {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      arr.forEach(x => sortRec(x.children))
    }
    sortRec(roots)
    return roots
  }, [comments])

  const submit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/community/topics/${topicId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, parentId: replyTo || undefined })
      })
      if (res.ok) {
        const r = await fetch(`/api/community/topics/${topicId}/comments`)
        const j = await r.json()
        setComments(j.comments || [])
        setText('')
        setReplyTo(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (commentId: string, content: string) => {
    setEditingId(commentId)
    setEditText(content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/community/topics/${topicId}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: editingId, content: editText })
      })
      if (res.ok) {
        const r = await fetch(`/api/community/topics/${topicId}/comments`)
        const j = await r.json()
        setComments(j.comments || [])
        cancelEdit()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (commentId: string) => {
    if (!confirm('Deseja remover este comentário?')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/community/topics/${topicId}/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        const r = await fetch(`/api/community/topics/${topicId}/comments`)
        const j = await r.json()
        setComments(j.comments || [])
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderComment = (c: TreeTopicComment, depth = 0) => (
    <div key={c.id} className="mt-3" style={{ marginLeft: depth > 0 ? depth * 16 : 0 }}>
      <div className="text-sm">
        <span className="font-medium">{c.author.name}</span>
        <span className="text-muted-foreground"> • {new Date(c.createdAt).toLocaleString('pt-BR')}</span>
      </div>
      {editingId === c.id ? (
        <div className="mt-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={submitting || !editText.trim()}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm mt-1 whitespace-pre-wrap">{c.content}</div>
      )}
      {!locked && (
        <div className="flex items-center gap-3 mt-1 text-xs">
          <button className="text-muted-foreground hover:text-primary" onClick={() => setReplyTo(c.id)}>
            Responder
          </button>
          {(currentUserId === c.author.id || currentUserRole === 'ADMIN' || currentUserRole === 'EDITOR') && (
            <>
              <button
                className="text-muted-foreground hover:text-primary"
                onClick={() => startEdit(c.id, c.content)}
              >
                Editar
              </button>
              <button
                className="text-destructive hover:text-destructive"
                onClick={() => removeComment(c.id)}
              >
                Remover
              </button>
            </>
          )}
        </div>
      )}
      {replyTo === c.id && !locked && (
        <div className="mt-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva uma resposta..."
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={submitting}>Enviar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setText('') }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {c.children.map(child => renderComment(child, depth + 1))}
    </div>
  )

  return (
    <section className="mt-4">
      <h4 className="text-sm font-semibold">Comentários do tópico</h4>
      {loading && <div className="text-sm text-muted-foreground mt-2">Carregando comentários...</div>}
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      {!locked && (
        <div className="mt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário..."
            className="mb-2"
          />
          <Button size="sm" onClick={submit} disabled={submitting}>Comentar</Button>
        </div>
      )}
      <div className="mt-4">
        {tree.length > 0 ? tree.map(c => renderComment(c)) : (
          <div className="text-sm text-muted-foreground">Nenhum comentário ainda.</div>
        )}
      </div>
    </section>
  )
}
