"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Link from 'next/link'

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
}

const accessOptions = [
  { id: 'FREE', label: 'Gratuita' },
  { id: 'SUBSCRIPTION', label: 'Assinatura' },
  { id: 'ONE_TIME', label: 'Compra avulsa' }
]

const tierOptions = ['FREE', 'INICIADO', 'ADEPTO', 'SACERDOCIO']

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function AdminCommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    accessModels: ['FREE'],
    tier: 'FREE',
    price: '',
    isActive: true
  })

  const accessLabel = useMemo(() => {
    return formData.accessModels
      .map((model) => accessOptions.find((option) => option.id === model)?.label)
      .filter(Boolean)
      .join(' • ')
  }, [formData.accessModels])

  const fetchCommunities = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/communities', { cache: 'no-store' })
      const data = await res.json()
      setCommunities(Array.isArray(data.communities) ? data.communities : [])
    } catch (error) {
      toast.error('Erro ao carregar comunidades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunities()
  }, [])

  const handleAccessToggle = (model: string, checked: boolean) => {
    setFormData((prev) => {
      const next = new Set(prev.accessModels)
      if (checked) next.add(model)
      else next.delete(model)
      return { ...prev, accessModels: Array.from(next) }
    })
  }

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value)
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        accessModels: formData.accessModels,
        tier: formData.tier,
        price: formData.price ? Number(formData.price) : null,
        isActive: formData.isActive
      }

      const res = await fetch('/api/admin/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao criar comunidade')
      }

      toast.success('Comunidade criada com sucesso')
      setFormData({
        name: '',
        slug: '',
        description: '',
        accessModels: ['FREE'],
        tier: 'FREE',
        price: '',
        isActive: true
      })
      setSlugTouched(false)
      await fetchCommunities()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar comunidade'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comunidades</h1>
        <p className="text-muted-foreground">
          Crie comunidades e defina modelos de acesso por assinatura ou compra avulsa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Comunidade</CardTitle>
          <CardDescription>
            {accessLabel || 'Defina um modelo de acesso para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="community-name">Nome</Label>
                <Input
                  id="community-name"
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="Ex: Comunidade das Bruxas"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-slug">Slug</Label>
                <Input
                  id="community-slug"
                  value={formData.slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setFormData((prev) => ({ ...prev, slug: event.target.value }))
                  }}
                  placeholder="comunidade-das-bruxas"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-description">Descrição</Label>
              <Textarea
                id="community-description"
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descreva o propósito da comunidade..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Modelo de acesso</Label>
                <div className="space-y-2">
                  {accessOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`access-${option.id}`}
                        checked={formData.accessModels.includes(option.id)}
                        onCheckedChange={(checked) => handleAccessToggle(option.id, Boolean(checked))}
                      />
                      <Label htmlFor={`access-${option.id}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tier de assinatura</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="community-price">Preço (avulso)</Label>
                <Input
                  id="community-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
              />
              <span className="text-sm text-muted-foreground">Comunidade ativa</span>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar comunidade'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comunidades cadastradas</CardTitle>
          <CardDescription>Visão geral das comunidades ativas e inativas.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma comunidade cadastrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comunidade</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {communities.map((community) => (
                  <TableRow key={community.id}>
                    <TableCell>
                      <div className="font-medium">{community.name}</div>
                      <div className="text-xs text-muted-foreground">{community.slug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {community.accessModels.map((model) => (
                          <Badge key={model} variant="secondary">
                            {accessOptions.find((option) => option.id === model)?.label || model}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{community.tier}</TableCell>
                    <TableCell>
                      {community.price != null ? `R$ ${community.price.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>{community.membersCount}</TableCell>
                    <TableCell>
                      <Badge variant={community.isActive ? 'default' : 'secondary'}>
                        {community.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/community/communities/${community.id}`}>
                          Gerenciar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
