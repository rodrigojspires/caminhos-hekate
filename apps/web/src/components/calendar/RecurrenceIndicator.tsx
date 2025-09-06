'use client'

import React from 'react'
import { Repeat, RotateCcw, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RecurrenceRule } from '@/types/events'

interface RecurrenceIndicatorProps {
  recurrenceRule?: RecurrenceRule
  isException?: boolean
  instanceCount?: number
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  // Allow forcing the indicator when we only know it's recurring
  isRecurring?: boolean
}

export function RecurrenceIndicator({
  recurrenceRule,
  isException = false,
  instanceCount,
  className,
  size = 'sm',
  showText = false,
  isRecurring = false
}: RecurrenceIndicatorProps) {
  if (!recurrenceRule && !isException && !isRecurring) {
    return null
  }

  const getRecurrenceText = () => {
    if (!recurrenceRule) return ''
    
    const { freq, interval = 1, count, until } = recurrenceRule
    
    let text = ''
    
    switch (freq) {
      case 'DAILY':
        text = interval === 1 ? 'Diário' : `A cada ${interval} dias`
        break
      case 'WEEKLY':
        text = interval === 1 ? 'Semanal' : `A cada ${interval} semanas`
        break
      case 'MONTHLY':
        text = interval === 1 ? 'Mensal' : `A cada ${interval} meses`
        break
      case 'YEARLY':
        text = interval === 1 ? 'Anual' : `A cada ${interval} anos`
        break
    }
    
    if (count) {
      text += ` (${count} vezes)`
    } else if (until) {
      text += ` (até ${until.toLocaleDateString('pt-BR')})`
    }
    
    return text
  }

  const getIcon = () => {
    if (isException) {
      return <RotateCcw className={cn(
        size === 'xs' && 'h-3 w-3',
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-4 w-4',
        size === 'lg' && 'h-5 w-5'
      )} />
    }
    
    return <Repeat className={cn(
      size === 'xs' && 'h-3 w-3',
      size === 'sm' && 'h-3 w-3',
      size === 'md' && 'h-4 w-4',
      size === 'lg' && 'h-5 w-5'
    )} />
  }

  const getBadgeVariant = () => {
    if (isException) return 'destructive'
    return 'secondary'
  }

  const getTooltipContent = () => {
    if (isException) {
      return 'Exceção da série recorrente'
    }
    
    let content = getRecurrenceText()
    if (instanceCount) {
      content += `\n${instanceCount} instâncias geradas`
    }
    
    return content
  }

  if (showText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={getBadgeVariant()}
              className={cn(
                'flex items-center gap-1',
                size === 'xs' && 'text-[10px] px-1 py-0.5',
                size === 'sm' && 'text-xs px-1.5 py-0.5',
                size === 'md' && 'text-sm px-2 py-1',
                size === 'lg' && 'text-base px-3 py-1.5',
                className
              )}
            >
              {getIcon()}
              <span>{isException ? 'Exceção' : getRecurrenceText()}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="whitespace-pre-line">{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center justify-center rounded-full',
            isException ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground',
            size === 'xs' && 'h-4 w-4',
            size === 'sm' && 'h-5 w-5',
            size === 'md' && 'h-6 w-6',
            size === 'lg' && 'h-8 w-8',
            className
          )}>
            {getIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-line">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Componente para mostrar série de eventos recorrentes
interface RecurrenceSeriesIndicatorProps {
  totalInstances: number
  visibleInstances: number
  recurrenceRule: RecurrenceRule
  className?: string
}

export function RecurrenceSeriesIndicator({
  totalInstances,
  visibleInstances,
  recurrenceRule,
  className
}: RecurrenceSeriesIndicatorProps) {
  const getFrequencyIcon = () => {
    switch (recurrenceRule.freq) {
      case 'DAILY':
        return <Clock className="h-4 w-4" />
      case 'WEEKLY':
      case 'MONTHLY':
      case 'YEARLY':
        return <Calendar className="h-4 w-4" />
      default:
        return <Repeat className="h-4 w-4" />
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'flex items-center gap-1 text-xs',
              className
            )}
          >
            {getFrequencyIcon()}
            <span>{visibleInstances}/{totalInstances}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Série recorrente: {visibleInstances} de {totalInstances} instâncias visíveis
            <br />
            Padrão: {recurrenceRule.freq.toLowerCase()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Componente para indicar conflitos de recorrência
interface RecurrenceConflictIndicatorProps {
  conflictType: 'overlap' | 'exception' | 'modification'
  conflictCount?: number
  className?: string
}

export function RecurrenceConflictIndicator({
  conflictType,
  conflictCount,
  className
}: RecurrenceConflictIndicatorProps) {
  const getConflictText = () => {
    switch (conflictType) {
      case 'overlap':
        return 'Sobreposição detectada'
      case 'exception':
        return 'Exceção na série'
      case 'modification':
        return 'Instância modificada'
      default:
        return 'Conflito'
    }
  }

  const getConflictColor = () => {
    switch (conflictType) {
      case 'overlap':
        return 'bg-yellow-500 text-yellow-50'
      case 'exception':
        return 'bg-red-500 text-red-50'
      case 'modification':
        return 'bg-blue-500 text-blue-50'
      default:
        return 'bg-gray-500 text-gray-50'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center justify-center rounded-full h-5 w-5 text-xs font-bold',
            getConflictColor(),
            className
          )}>
            !
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {getConflictText()}
            {conflictCount && conflictCount > 1 && (
              <><br />{conflictCount} conflitos</>  
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}