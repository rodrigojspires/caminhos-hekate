'use client'

import * as React from 'react'
import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerWithRangeProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  placeholder = 'Selecione um período',
  disabled = false,
}: DatePickerWithRangeProps) {
  const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(date)

  React.useEffect(() => {
    setSelectedDate(date)
  }, [date])

  const handleDateChange = (newDate: DateRange | undefined) => {
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate?.from ? (
              selectedDate.to ? (
                <>
                  {format(selectedDate.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                  {format(selectedDate.to, 'dd/MM/yyyy', { locale: ptBR })}
                </>
              ) : (
                format(selectedDate.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedDate?.from}
            selected={selectedDate}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Preset ranges for common date selections
interface DateRangePreset {
  label: string
  range: DateRange
}

const getDateRangePresets = (): DateRangePreset[] => {
  const today = new Date()
  const yesterday = addDays(today, -1)
  const lastWeek = addDays(today, -7)
  const lastMonth = addDays(today, -30)
  const lastThreeMonths = addDays(today, -90)

  return [
    {
      label: 'Hoje',
      range: { from: today, to: today },
    },
    {
      label: 'Ontem',
      range: { from: yesterday, to: yesterday },
    },
    {
      label: 'Últimos 7 dias',
      range: { from: lastWeek, to: today },
    },
    {
      label: 'Últimos 30 dias',
      range: { from: lastMonth, to: today },
    },
    {
      label: 'Últimos 3 meses',
      range: { from: lastThreeMonths, to: today },
    },
  ]
}

interface DateRangePickerWithPresetsProps extends DatePickerWithRangeProps {
  showPresets?: boolean
}

export function DateRangePickerWithPresets({
  className,
  date,
  onDateChange,
  placeholder = 'Selecione um período',
  disabled = false,
  showPresets = true,
}: DateRangePickerWithPresetsProps) {
  const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(date)
  const presets = getDateRangePresets()

  React.useEffect(() => {
    setSelectedDate(date)
  }, [date])

  const handleDateChange = (newDate: DateRange | undefined) => {
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const handlePresetSelect = (preset: DateRangePreset) => {
    handleDateChange(preset.range)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate?.from ? (
              selectedDate.to ? (
                <>
                  {format(selectedDate.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                  {format(selectedDate.to, 'dd/MM/yyyy', { locale: ptBR })}
                </>
              ) : (
                format(selectedDate.from, 'dd/MM/yyyy', { locale: ptBR })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {showPresets && (
              <div className="border-r p-3">
                <div className="text-sm font-medium mb-2">Períodos</div>
                <div className="space-y-1">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start font-normal"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={selectedDate?.from}
                selected={selectedDate}
                onSelect={handleDateChange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Export both components
export { DatePickerWithRange as DateRangePicker }
export default DateRangePickerWithPresets