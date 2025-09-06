"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function LeaderboardAdmin() {
  const [category, setCategory] = useState('POINTS')
  const [period, setPeriod] = useState('ALL_TIME')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchRows = async () => {
      setLoading(true)
      const params = new URLSearchParams({ category, period, limit: '50' })
      if (period === 'CUSTOM') {
        if (start) params.set('start', start)
        if (end) params.set('end', end)
      }
      const res = await fetch(`/api/gamification/leaderboard?${params}`)
      const data = await res.json()
      if (!cancelled) {
        setRows(data.leaderboard || [])
        setLoading(false)
      }
    }
    fetchRows()
    return () => { cancelled = true }
  }, [category, period, start, end])

  const exportCsv = async () => {
    const params = new URLSearchParams({ category, period, limit: '100', format: 'csv' })
    if (period === 'CUSTOM') {
      if (start) params.set('start', start)
      if (end) params.set('end', end)
    }
    const res = await fetch(`/api/gamification/leaderboard?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leaderboard_${category.toLowerCase()}_${period.toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-2 mb-3 md:items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="POINTS">Pontos</SelectItem>
              <SelectItem value="ACHIEVEMENTS">Conquistas</SelectItem>
              <SelectItem value="BADGES">Medalhas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Hoje</SelectItem>
              <SelectItem value="WEEKLY">Semana</SelectItem>
              <SelectItem value="MONTHLY">Mês</SelectItem>
              <SelectItem value="ALL_TIME">Todos os tempos</SelectItem>
              <SelectItem value="CUSTOM">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === 'CUSTOM' && (
            <div className="flex gap-2 items-center">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1" />
              <span className="text-sm">até</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1" />
            </div>
          )}
          <Button variant="outline" onClick={exportCsv}>Exportar CSV</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Pontos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={`${r.userId}-${r.rank}`}>
                  <TableCell>{r.rank}</TableCell>
                  <TableCell>{r.name || r.userId}</TableCell>
                  <TableCell>{r.score}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    {loading ? 'Carregando...' : 'Sem dados'}
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
