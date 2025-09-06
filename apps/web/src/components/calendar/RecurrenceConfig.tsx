'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Repeat, X } from 'lucide-react'
import { RecurrenceRule, RecurrenceFrequency, WeekDay } from '@/lib/recurrence/types'
import { format, addDays, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RecurrenceConfigProps {
  value?: RecurrenceRule
  onChange: (rule: RecurrenceRule | null) => void
  startDate: Date
}

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Diário' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' }
] as const

const WEEKDAY_OPTIONS = [
  { value: 'MO', label: 'Seg', fullLabel: 'Segunda-feira' },
  { value: 'TU', label: 'Ter', fullLabel: 'Terça-feira' },
  { value: 'WE', label: 'Qua', fullLabel: 'Quarta-feira' },
  { value: 'TH', label: 'Qui', fullLabel: 'Quinta-feira' },
  { value: 'FR', label: 'Sex', fullLabel: 'Sexta-feira' },
  { value: 'SA', label: 'Sáb', fullLabel: 'Sábado' },
  { value: 'SU', label: 'Dom', fullLabel: 'Domingo' }
] as const

const MONTH_POSITIONS = [
  { value: 1, label: '1º' },
  { value: 2, label: '2º' },
  { value: 3, label: '3º' },
  { value: 4, label: '4º' },
  { value: -1, label: 'Último' }
] as const

export function RecurrenceConfig({ value, onChange, startDate }: RecurrenceConfigProps) {
  const [isEnabled, setIsEnabled] = useState(!!value)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(value?.frequency || 'WEEKLY')
  const [interval, setInterval] = useState(value?.interval || 1)
  const [byWeekDay, setByWeekDay] = useState<WeekDay[]>(value?.byWeekDay || [])
  const [byMonthDay, setByMonthDay] = useState<number[]>(value?.byMonthDay || [])
  const [bySetPos, setBySetPos] = useState<number[]>(value?.bySetPos || [])
  const [count, setCount] = useState<number | undefined>(value?.count)
  const [until, setUntil] = useState<Date | undefined>(value?.until)
  const [endType, setEndType] = useState<'never' | 'count' | 'until'>(
    value?.count ? 'count' : value?.until ? 'until' : 'never'
  )

  useEffect(() => {
    if (!isEnabled) {
      onChange(null)
      return
    }

    const rule: RecurrenceRule = {
      frequency,
      interval,
      ...(byWeekDay.length > 0 && { byWeekDay }),
      ...(byMonthDay.length > 0 && { byMonthDay }),
      ...(bySetPos.length > 0 && { bySetPos }),
      ...(endType === 'count' && count && { count }),
      ...(endType === 'until' && until && { until })
    }

    onChange(rule)
  }, [isEnabled, frequency, interval, byWeekDay, byMonthDay, bySetPos, count, until, endType, onChange])

  const handleFrequencyChange = (newFrequency: RecurrenceFrequency) => {
    setFrequency(newFrequency)
    
    // Reset specific configurations when frequency changes
    if (newFrequency !== 'WEEKLY') {
      setByWeekDay([])
    }
    if (newFrequency !== 'MONTHLY') {
      setByMonthDay([])
      setBySetPos([])
    }
  }

  const toggleWeekDay = (weekday: WeekDay) => {
    setByWeekDay(prev => 
      prev.includes(weekday)
        ? prev.filter(d => d !== weekday)
        : [...prev, weekday]
    )
  }

  const toggleMonthDay = (day: number) => {
    setByMonthDay(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const toggleSetPos = (pos: number) => {
    setBySetPos(prev => 
      prev.includes(pos)
        ? prev.filter(p => p !== pos)
        : [...prev, pos]
    )
  }

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Repetir Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setIsEnabled(true)}
            className="w-full"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Configurar Repetição
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Configurar Repetição
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEnabled(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequência */}
        <div className="space-y-2">
          <Label>Repetir</Label>
          <div className="flex items-center gap-2">
            <span>A cada</span>
            <Input
              type="number"
              min={1}
              max={999}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <Select value={frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Configurações específicas por frequência */}
        {frequency === 'WEEKLY' && (
          <div className="space-y-2">
            <Label>Dias da Semana</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map(day => (
                <Button
                  key={day.value}
                  variant={byWeekDay.includes(day.value as WeekDay) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWeekDay(day.value as WeekDay)}
                  title={day.fullLabel}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {frequency === 'MONTHLY' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Repetir por</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="by-day"
                    checked={byMonthDay.length > 0}
                    onCheckedChange={(checked) => {
                      if (!checked) setByMonthDay([])
                      else setByMonthDay([startDate.getDate()])
                    }}
                  />
                  <Label htmlFor="by-day">
                    Dia do mês ({startDate.getDate()})
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="by-position"
                    checked={bySetPos.length > 0}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        setBySetPos([])
                        setByWeekDay([])
                      } else {
                        const weekDay = WEEKDAY_OPTIONS[startDate.getDay() === 0 ? 6 : startDate.getDay() - 1]
                        setByWeekDay([weekDay.value as WeekDay])
                        setBySetPos([Math.ceil(startDate.getDate() / 7)])
                      }
                    }}
                  />
                  <Label htmlFor="by-position">
                    Posição na semana
                  </Label>
                </div>
              </div>
            </div>

            {bySetPos.length > 0 && (
              <div className="space-y-2">
                <Label>Posição</Label>
                <div className="flex flex-wrap gap-2">
                  {MONTH_POSITIONS.map(pos => (
                    <Button
                      key={pos.value}
                      variant={bySetPos.includes(pos.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSetPos(pos.value)}
                    >
                      {pos.label}
                    </Button>
                  ))}
                </div>
                
                <Label>Dia da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map(day => (
                    <Button
                      key={day.value}
                      variant={byWeekDay.includes(day.value as WeekDay) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleWeekDay(day.value as WeekDay)}
                      title={day.fullLabel}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fim da repetição */}
        <div className="space-y-2">
          <Label>Terminar</Label>
          <Select value={endType} onValueChange={(value: 'never' | 'count' | 'until') => setEndType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Nunca</SelectItem>
              <SelectItem value="count">Após um número de ocorrências</SelectItem>
              <SelectItem value="until">Em uma data específica</SelectItem>
            </SelectContent>
          </Select>

          {endType === 'count' && (
            <div className="flex items-center gap-2">
              <span>Após</span>
              <Input
                type="number"
                min={1}
                max={999}
                value={count || ''}
                onChange={(e) => setCount(parseInt(e.target.value) || undefined)}
                className="w-20"
              />
              <span>ocorrências</span>
            </div>
          )}

          {endType === 'until' && (
            <Input
              type="date"
              value={until ? format(until, 'yyyy-MM-dd') : ''}
              onChange={(e) => setUntil(e.target.value ? new Date(e.target.value) : undefined)}
              min={format(addDays(startDate, 1), 'yyyy-MM-dd')}
            />
          )}
        </div>

        {/* Preview */}
        {value && (
          <div className="space-y-2">
            <Label>Resumo</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                {getRecurrenceDescription(value, startDate)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getRecurrenceDescription(rule: RecurrenceRule, startDate: Date): string {
  const { frequency, interval, byWeekDay, byMonthDay, bySetPos, count, until } = rule
  
  let description = `Repetir ${frequency === 'DAILY' ? 'diariamente' : 
                              frequency === 'WEEKLY' ? 'semanalmente' :
                              frequency === 'MONTHLY' ? 'mensalmente' : 'anualmente'}`
  
  if (interval > 1) {
    description += ` a cada ${interval} ${frequency === 'DAILY' ? 'dias' : 
                                        frequency === 'WEEKLY' ? 'semanas' :
                                        frequency === 'MONTHLY' ? 'meses' : 'anos'}`
  }
  
  if (byWeekDay && byWeekDay.length > 0) {
    const days = byWeekDay.map(day => {
      const dayOption = WEEKDAY_OPTIONS.find(opt => opt.value === day)
      return dayOption?.fullLabel || day
    }).join(', ')
    description += ` em ${days}`
  }
  
  if (byMonthDay && byMonthDay.length > 0) {
    description += ` no dia ${byMonthDay.join(', ')} do mês`
  }
  
  if (bySetPos && bySetPos.length > 0) {
    const positions = bySetPos.map(pos => {
      const posOption = MONTH_POSITIONS.find(opt => opt.value === pos)
      return posOption?.label || pos.toString()
    }).join(', ')
    description += ` na ${positions} semana`
  }
  
  if (count) {
    description += `, por ${count} ocorrências`
  } else if (until) {
    description += `, até ${format(until, 'dd/MM/yyyy', { locale: ptBR })}`
  }
  
  return description
}