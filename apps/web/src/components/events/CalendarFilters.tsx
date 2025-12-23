'use client'

import React from 'react'
import { Filter, X, Calendar, Users, Tag, Clock } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EventType, EventFilters } from '@/types/events'
import { cn } from '@/lib/utils'

interface CalendarFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  availableTags?: string[]
  className?: string
  trigger?: React.ReactNode
  onClose?: () => void
}

const EVENT_TYPE_OPTIONS = [
  { value: EventType.WEBINAR, label: 'Ritual', color: 'bg-blue-100 text-blue-800' },
  { value: EventType.WORKSHOP, label: 'Workshop', color: 'bg-green-100 text-green-800' },
  { value: EventType.COURSE, label: 'Curso', color: 'bg-purple-100 text-purple-800' },
  { value: EventType.MEETING, label: 'Terapia', color: 'bg-yellow-100 text-yellow-800' }
]

const TIME_FILTER_OPTIONS = [
  { value: 'upcoming', label: 'Próximos eventos' },
  { value: 'today', label: 'Hoje' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'past', label: 'Eventos passados' }
]

const PARTICIPATION_OPTIONS = [
  { value: 'all', label: 'Todos os eventos' },
  { value: 'my_events', label: 'Meus eventos' },
  { value: 'registered', label: 'Eventos inscritos' },
  { value: 'created', label: 'Eventos criados' }
]

export function CalendarFilters({ 
  filters, 
  onFiltersChange, 
  availableTags = [],
  className,
  trigger,
  onClose
}: CalendarFiltersProps) {
  const [open, setOpen] = React.useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next && onClose) onClose()
  }

  const updateFilter = (key: keyof EventFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const toggleEventType = (type: EventType) => {
    const currentTypes = filters.types || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    
    updateFilter('types', newTypes.length > 0 ? newTypes : undefined)
  }

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    
    updateFilter('tags', newTags.length > 0 ? newTags : undefined)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = () => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof EventFilters]
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : true)
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.types?.length) count++
    if (filters.tags?.length) count++
    if (filters.search) count++
    if (filters.timeFilter) count++
    if (filters.participationFilter && filters.participationFilter !== 'all') count++
    if (filters.creatorId) count++
    return count
  }

  const defaultTrigger = (
    <Button variant="outline" className={cn("relative", className)}>
      <Filter className="h-4 w-4 mr-2" />
      Filtros
      {hasActiveFilters() && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {getActiveFiltersCount()}
        </Badge>
      )}
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros do Calendário</span>
            </SheetTitle>
            
            {hasActiveFilters() && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6">
            {/* Busca */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Buscar Eventos</Label>
              <div className="relative">
                <Input
                  placeholder="Digite o nome do evento..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilter('search', e.target.value || undefined)}
                  className="pr-8"
                />
                {filters.search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => updateFilter('search', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Filtro de tempo */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Período</span>
              </Label>
              
              <Select
                value={filters.timeFilter || 'upcoming'}
                onValueChange={(value) => updateFilter('timeFilter', value === 'upcoming' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Filtro de participação */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Participação</span>
              </Label>
              
              <Select
                value={filters.participationFilter || 'all'}
                onValueChange={(value) => updateFilter('participationFilter', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a participação" />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Tipos de evento */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Tipos de Evento</span>
              </Label>
              
              <div className="space-y-2">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const isSelected = filters.types?.includes(option.value) || false
                  
                  return (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${option.value}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleEventType(option.value)}
                      />
                      <Label 
                        htmlFor={`type-${option.value}`}
                        className="flex-1 cursor-pointer"
                      >
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "transition-colors",
                            isSelected ? option.color : "bg-muted text-muted-foreground"
                          )}
                        >
                          {option.label}
                        </Badge>
                      </Label>
                    </div>
                  )
                })}
              </div>
              
              {filters.types && filters.types.length > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{filters.types.length} tipo(s) selecionado(s)</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateFilter('types', undefined)}
                    className="h-auto p-0 text-xs"
                  >
                    Limpar
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>Tags</span>
                </Label>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableTags.map((tag) => {
                    const isSelected = filters.tags?.includes(tag) || false
                    
                    return (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleTag(tag)}
                        />
                        <Label 
                          htmlFor={`tag-${tag}`}
                          className="flex-1 cursor-pointer"
                        >
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "transition-colors",
                              isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {tag}
                          </Badge>
                        </Label>
                      </div>
                    )
                  })}
                </div>
                
                {filters.tags && filters.tags.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{filters.tags.length} tag(s) selecionada(s)</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => updateFilter('tags', undefined)}
                      className="h-auto p-0 text-xs"
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Resumo dos filtros ativos */}
            {hasActiveFilters() && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Filtros Ativos</Label>
                  
                  <div className="space-y-2">
                    {filters.search && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">Busca: &quot;{filters.search}&quot;</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => updateFilter('search', undefined)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {filters.timeFilter && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">
                          Período: {TIME_FILTER_OPTIONS.find(o => o.value === filters.timeFilter)?.label}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => updateFilter('timeFilter', undefined)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {filters.participationFilter && filters.participationFilter !== 'all' && (
                      <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">
                          Participação: {PARTICIPATION_OPTIONS.find(o => o.value === filters.participationFilter)?.label}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => updateFilter('participationFilter', undefined)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
