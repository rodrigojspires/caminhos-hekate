"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

type Community = {
  id: string
  name: string
  slug: string
  description?: string | null
  accessModels: string[]
  tier: string
  price: number | null
  isActive: boolean
  membersCount: number
  isMember: boolean
  membershipStatus: string | null
  allowedByTier: boolean
  accessLabel: string
}

export default function DashboardCommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [showInactiveNotice, setShowInactiveNotice] = useState(false)

  const fetchCommunities = async () => {
    try {
      setLoading(true)
      setShowInactiveNotice(false)
      const res = await fetch('/api/communities', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar comunidades')
      }
      const list = Array.isArray(data.communities) ? data.communities : []
      if (list.length === 0) {
        const fallbackRes = await fetch('/api/communities?includeInactive=1', { cache: 'no-store' })
        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok && Array.isArray(fallbackData.communities)) {
          setCommunities(fallbackData.communities)
          setShowInactiveNotice(true)
          return
        }
      }
      setCommunities(list)
    } catch (error) {
      toast.error('Erro ao carregar comunidades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunities()
  }, [])

  const { myCommunities, availableCommunities } = useMemo(() => {
    const mine = communities.filter((community) => community.isMember)
    const available = communities.filter((community) => !community.isMember)
    return { myCommunities: mine, availableCommunities: available }
  }, [communities])

  const handleEnroll = async (communityId: string) => {
    try {
      setActionId(communityId)
      const res = await fetch(`/api/communities/${communityId}/membership`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao se inscrever')
      }
      await fetchCommunities()
      toast.success(data.status === 'active' ? 'Inscrição confirmada' : 'Inscrição pendente')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao se inscrever'
      toast.error(message)
    } finally {
      setActionId(null)
    }
  }

  const renderCommunityCard = (community: Community) => {
    const isPending = community.membershipStatus === 'pending'
    const priceLabel = community.price != null ? `R$ ${community.price.toFixed(2)}` : null
    const isInactive = !community.isActive
    const detailUrl = `/dashboard/comunidades/${community.id}`

    return (
      <Card key={community.id} className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{community.name}</CardTitle>
              <CardDescription>{community.description || 'Sem descrição cadastrada.'}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {isInactive ? <Badge variant="secondary">Inativa</Badge> : null}
              {community.isMember ? (
                <Badge variant={isPending ? 'secondary' : 'default'}>
                  {isPending ? 'Pendente' : 'Inscrito'}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{community.accessLabel}</div>
            {priceLabel && <div>Preço: {priceLabel}</div>}
            <div>{community.membersCount} membros</div>
          </div>
          {community.isMember ? (
            <Button asChild variant="outline">
              <Link href={detailUrl}>Acessar</Link>
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link href={detailUrl}>Ver detalhes</Link>
              </Button>
              <Button
                onClick={() => handleEnroll(community.id)}
                disabled={actionId === community.id || isInactive}
              >
                {isInactive ? 'Indisponível' : actionId === community.id ? 'Processando...' : 'Participar'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunidades</h1>
        <p className="text-muted-foreground">
          Explore e participe das comunidades disponíveis na plataforma.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Minhas Comunidades</h2>
        {showInactiveNotice ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Nenhuma comunidade ativa encontrada. Exibindo comunidades inativas.
            </CardContent>
          </Card>
        ) : null}
        {myCommunities.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Você ainda não participa de nenhuma comunidade.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myCommunities.map(renderCommunityCard)}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Comunidades Disponíveis</h2>
        {availableCommunities.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Nenhuma comunidade disponível no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableCommunities.map(renderCommunityCard)}
          </div>
        )}
      </section>
    </div>
  )
}
