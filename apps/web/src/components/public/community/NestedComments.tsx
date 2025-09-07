"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type RawComment = {
  id: string
  content: string
  postId: string
  author: { id: string; name: string; image?: string | null }
  parentId?: string | null
  createdAt: string
  _count?: { reactions: number; replies: number }
  reactions?: { type: string }[]
}

type TreeComment = RawComment & { children: TreeComment[] }

export default function NestedComments({ postId, locked }: { postId: string; locked?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<RawComment[]>([])
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(`/api/community/posts/${postId}/comments`)        
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
  }, [postId])

  const tree = useMemo<TreeComment[]>(() => {
    const map = new Map<string, TreeComment>()
    const roots: TreeComment[] = []
    comments.forEach(c => map.set(c.id, { ...c, children: [] }))
    comments.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(map.get(c.id)!)
      } else {
        roots.push(map.get(c.id)!)
      }
    })
    const sortRec = (arr: TreeComment[]) => {
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
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, parentId: replyTo || undefined })
      })
      if (res.ok) {
        // reload
        const r = await fetch(`/api/community/posts/${postId}/comments`)
        const j = await r.json()
        setComments(j.comments || [])
        setText('')
        setReplyTo(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reload = async () => {
    const r = await fetch(`/api/community/posts/${postId}/comments`)
    const j = await r.json()
    setComments(j.comments || [])
  }

  const toggleReaction = async (commentId: string, type: string) => {
    try { 
      await fetch(`/api/community/comments/${commentId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
      await reload()
    } catch {}
  }

  const renderComment = (c: TreeComment, depth = 0) => (
    <div key={c.id} className="mt-3" style={{ marginLeft: depth > 0 ? depth * 16 : 0 }}>
      <div className="text-sm"><span className="font-medium">{c.author.name}</span> <span className="text-muted-foreground">• {new Date(c.createdAt).toLocaleString('pt-BR')}</span></div>
      <div className="text-sm mt-1 whitespace-pre-wrap">{c.content}</div>
      <div className="flex items-center gap-3 mt-1 text-xs">
        {(() => {
          const likeCount = (c.reactions || []).filter(r => r.type === 'LIKE').length
          const heartCount = (c.reactions || []).filter(r => r.type === 'HEART').length
          return (
            <>
              <button className="text-primary" onClick={() => toggleReaction(c.id, 'LIKE')}>Curtir{likeCount > 0 ? ` (${likeCount})` : ''}</button>
              <button className="text-pink-600" onClick={() => toggleReaction(c.id, 'HEART')}>❤️{heartCount > 0 ? ` (${heartCount})` : ''}</button>
            </>
          )
        })()}
        {!locked && <button className="text-muted-foreground hover:text-primary" onClick={() => setReplyTo(c.id)}>Responder</button>}
      </div>
      {replyTo === c.id && !locked && (
        <div className="mt-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma resposta..." className="mb-2" />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={submitting}>Enviar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setText('') }}>Cancelar</Button>
          </div>
        </div>
      )}
      {c.children.map(child => renderComment(child, depth + 1))}
    </div>
  )

  return (
    <section className="mt-8">
      <h3 className="text-base font-semibold">Comentários</h3>
      {loading && <div className="text-sm text-muted-foreground mt-2">Carregando comentários...</div>}
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      {!locked && (
        <div className="mt-3">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário..." className="mb-2" />
          <Button size="sm" onClick={submit} disabled={submitting}>Comentar</Button>
        </div>
      )}
      <div className="mt-4">
        {tree.map(c => renderComment(c))}
      </div>
    </section>
  )
}
