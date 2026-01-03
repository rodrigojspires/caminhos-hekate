"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type FollowToggleProps = {
  type: 'topic' | 'author' | 'post'
  id: string
}

export default function FollowToggle({ type, id }: FollowToggleProps) {
  const [loading, setLoading] = useState(true)
  const [followed, setFollowed] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(`/api/community/follow/${type}/${id}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({ followed: false }))
        if (!mounted) return
        setFollowed(!!j.followed)
        setLoading(false)
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [type, id])

  const toggle = async () => {
    setLoading(true)
    const method = followed ? 'DELETE' : 'POST'
    const res = await fetch(`/api/community/follow/${type}/${id}`, { method })
    if (res.ok) {
      const j = await res.json().catch(() => ({}))
      setFollowed(!!j.followed)
    }
    setLoading(false)
  }

  return (
    <Button size="sm" variant={followed ? 'secondary' : 'outline'} disabled={loading} onClick={toggle}>
      {followed ? 'Seguindo' : 'Seguir'}
    </Button>
  )
}
