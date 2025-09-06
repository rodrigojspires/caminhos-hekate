'use client'

import { useState } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Filter, Download, MoreHorizontal } from 'lucide-react'

interface Event {
  id: string
  name: string
  type: 'click' | 'view' | 'conversion' | 'error'
  timestamp: string
  user: string
  page: string
  value?: number
}

interface EventsTableProps {
  events?: Event[]
  loading?: boolean
}

const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Page View',
    type: 'view',
    timestamp: '2024-01-15T10:30:00Z',
    user: 'user@example.com',
    page: '/dashboard',
    value: 1
  },
  {
    id: '2',
    name: 'Button Click',
    type: 'click',
    timestamp: '2024-01-15T10:25:00Z',
    user: 'admin@example.com',
    page: '/settings',
    value: 1
  },
  {
    id: '3',
    name: 'Form Submission',
    type: 'conversion',
    timestamp: '2024-01-15T10:20:00Z',
    user: 'user2@example.com',
    page: '/contact',
    value: 100
  }
]

const getEventTypeColor = (type: Event['type']) => {
  switch (type) {
    case 'click':
      return 'bg-blue-100 text-blue-800'
    case 'view':
      return 'bg-green-100 text-green-800'
    case 'conversion':
      return 'bg-purple-100 text-purple-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('pt-BR')
}

export { EventsTable }

export default function EventsTable({ events = mockEvents, loading = false }: EventsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<Event['type'] | 'all'>('all')

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.page.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || event.type === filterType
    return matchesSearch && matchesFilter
  })

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('view')}>
                Visualizações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('click')}>
                Cliques
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('conversion')}>
                Conversões
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('error')}>
                Erros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Página</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nenhum evento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>
                    <Badge className={getEventTypeColor(event.type)}>
                      {event.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.user}</TableCell>
                  <TableCell>{event.page}</TableCell>
                  <TableCell>{formatTimestamp(event.timestamp)}</TableCell>
                  <TableCell>{event.value || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Exportar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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