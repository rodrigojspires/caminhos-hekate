'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'

interface Event {
  id: string
  name: string
  category: string
  action: string
  timestamp: Date | string
  userId?: string
  page?: string
  properties?: Record<string, any>
  user?: {
    name: string | null
    email: string
  }
}

interface EventsTableProps {
  events: Event[]
  loading?: boolean
}

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'interaction':
      return 'bg-blue-100 text-blue-800'
    case 'navigation':
      return 'bg-green-100 text-green-800'
    case 'conversion':
      return 'bg-purple-100 text-purple-800'
    case 'media':
      return 'bg-orange-100 text-orange-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatTimestamp = (timestamp: Date) => {
  return timestamp.toLocaleString('pt-BR')
}

export function EventsTable({ events, loading = false }: EventsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Mapear eventos para o formato esperado
  const mappedEvents = events.map(event => ({
    ...event,
    timestamp: new Date(event.timestamp),
    // Garantir que temos os campos necessários
    category: event.category || 'unknown',
    action: event.action || event.name || 'unknown'
  }))

  const filteredEvents = mappedEvents.filter(event => {
    const action = event.action.toLowerCase()
    const category = event.category.toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    
    const matchesSearch = action.includes(searchLower) || 
                         category.includes(searchLower)
    
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    const aTime = a.timestamp.getTime()
    const bTime = b.timestamp.getTime()
    return sortOrder === 'desc' ? bTime - aTime : aTime - bTime
  })
  
  // Verificar se temos dados de usuário (indica que é admin)
  const hasUserData = events.some(event => event.user)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos Recentes</CardTitle>
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todas as categorias</option>
            <option value="navigation">Navegação</option>
            <option value="interaction">Interação</option>
            <option value="conversion">Conversão</option>
            <option value="media">Mídia</option>
            <option value="error">Erros</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Ação</TableHead>
                {hasUserData && <TableHead>Usuário</TableHead>}
                <TableHead className="cursor-pointer" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                  Timestamp {sortOrder === 'desc' ? '↓' : '↑'}
                </TableHead>
                <TableHead>Propriedades</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasUserData ? 5 : 4} className="text-center text-muted-foreground py-8">
                  Nenhum evento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getCategoryColor(event.category)} text-white border-0`}
                    >
                      {event.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{event.action}</TableCell>
                  {hasUserData && (
                    <TableCell className="text-sm">
                      {event.user ? (
                        <div>
                          <div className="font-medium">{event.user.name || 'Sem nome'}</div>
                          <div className="text-xs text-muted-foreground">{event.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(event.timestamp, { addSuffix: true, locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.properties && Object.keys(event.properties).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(event.properties).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}