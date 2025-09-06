"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function NotificationsAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [days, setDays] = useState('30')

  const reload = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter === 'read') params.set('isRead', 'true')
    if (filter === 'unread') params.set('isRead', 'false')
    const res = await fetch(`/api/admin/gamification/notifications?${params}`)
    const data = await res.json()
    setRows(data.data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await reload()
    }
    run()
    return () => { cancelled = true }
  }, [reload])

  const cleanup = async () => {
    try {
      const res = await fetch('/api/admin/gamification/notifications/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: Number(days) || 30 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao limpar')
      toast.success(`Removidas ${data.removed} notificações antigas`)
      await reload()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao limpar notificações')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-col md:flex-row gap-2 md:items-center">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Limpar antigas (dias):</span>
            <Input className="w-20" type="number" value={days} onChange={(e) => setDays(e.target.value)} />
            <Button variant="outline" onClick={cleanup}>Limpar</Button>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>{n.type}</TableCell>
                  <TableCell>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.isRead ? 'secondary' : 'default'}>
                      {n.isRead ? 'Lida' : 'Não lida'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(n.createdAt).toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    {loading ? 'Carregando...' : 'Sem notificações'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
