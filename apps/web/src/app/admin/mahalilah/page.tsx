'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Breadcrumbs } from '@/components/admin/Breadcrumbs'

type Room = {
  id: string
  code: string
  status: string
  planType: string
  maxParticipants: number
  createdAt: string
  createdBy: { id: string; name: string | null; email: string }
  orderId: string | null
  participantsCount: number
  invitesCount: number
  stats: { moves: number; therapyEntries: number; cardDraws: number }
}

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-100 text-slate-800',
  COMPLETED: 'bg-purple-100 text-purple-800'
}

const planLabel: Record<string, string> = {
  SINGLE_SESSION: 'Avulsa',
  SUBSCRIPTION: 'Assinatura',
  SUBSCRIPTION_LIMITED: 'Assinatura limitada'
}

export default function AdminMahaLilahPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [therapistEmail, setTherapistEmail] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [planType, setPlanType] = useState('SINGLE_SESSION')

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://mahalilahonline.com.br'
    return process.env.NEXT_PUBLIC_MAHALILAH_URL || 'https://mahalilahonline.com.br'
  }, [])

  const loadRooms = async (status?: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    const activeStatus = status ?? filterStatus
    if (activeStatus && activeStatus !== 'all') params.set('status', activeStatus)
    const res = await fetch(`/api/admin/mahalilah/rooms${params.toString() ? `?${params.toString()}` : ''}`)
    if (!res.ok) {
      toast.error('Erro ao carregar salas')
      setLoading(false)
      return
    }
    const data = await res.json()
    setRooms(data.rooms || [])
    setLoading(false)
  }

  useEffect(() => {
    loadRooms()
  }, [])

  const handleCreateRoom = async () => {
    setCreating(true)
    const res = await fetch('/api/admin/mahalilah/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapistEmail,
        maxParticipants,
        planType
      })
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(payload.error || 'Erro ao criar sala')
      setCreating(false)
      return
    }

    toast.success('Sala criada com sucesso.')
    setTherapistEmail('')
    await loadRooms()
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Maha Lilah', current: true }]} />

      <Card>
        <CardHeader>
          <CardTitle>Salas Maha Lilah</CardTitle>
          <CardDescription>Visão global das salas e criação manual sem pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email do terapeuta</label>
              <Input
                type="email"
                value={therapistEmail}
                onChange={(event) => setTherapistEmail(event.target.value)}
                placeholder="terapeuta@dominio.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Participantes</label>
              <Input
                type="number"
                min={2}
                max={12}
                value={maxParticipants}
                onChange={(event) => setMaxParticipants(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plano</label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_SESSION">Avulsa (sem pagamento)</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Assinatura</SelectItem>
                  <SelectItem value="SUBSCRIPTION_LIMITED">Assinatura limitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateRoom} disabled={creating || !therapistEmail}>
              {creating ? 'Criando...' : 'Criar sala avulsa'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={(value) => {
              setFilterStatus(value)
              loadRooms(value)
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Ativas</SelectItem>
                <SelectItem value="CLOSED">Encerradas</SelectItem>
                <SelectItem value="COMPLETED">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => loadRooms()}>
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando salas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Convites</TableHead>
                  <TableHead>Jogadas</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma sala encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>
                        <div className="font-medium">{room.code}</div>
                        <Link href={`${baseUrl}/rooms/${room.code}`} className="text-xs text-purple-500 hover:underline">
                          Abrir sala
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{room.createdBy.name || room.createdBy.email}</div>
                        <div className="text-xs text-muted-foreground">{room.createdBy.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge[room.status] || 'bg-slate-100 text-slate-800'}>
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{planLabel[room.planType] || room.planType}</TableCell>
                      <TableCell>
                        {room.participantsCount}/{room.maxParticipants}
                      </TableCell>
                      <TableCell>{room.invitesCount}</TableCell>
                      <TableCell>{room.stats.moves}</TableCell>
                      <TableCell>{room.orderId ? 'Pago' : 'Admin'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
