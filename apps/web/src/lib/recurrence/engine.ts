import { 
  RecurrenceRule,
  RecurrenceFrequency,
  WeekDay,
  RecurringEventInstance
} from './types'
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  isSameDay,
  format,
  getDay,
  getDaysInMonth,
  setDate,
  getDate,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval
} from 'date-fns'

const WEEKDAY_MAP: Record<WeekDay, number> = {
  'SU': 0, // Sunday
  'MO': 1, // Monday
  'TU': 2, // Tuesday
  'WE': 3, // Wednesday
  'TH': 4, // Thursday
  'FR': 5, // Friday
  'SA': 6  // Saturday
}

export class RecurrenceEngine {
  /**
   * Gera instâncias de eventos recorrentes dentro de um intervalo de datas
   */
  generateInstances(
    rule: RecurrenceRule,
    startDate: Date,
    rangeStart: Date,
    rangeEnd: Date,
    eventDuration: number = 0, // em minutos
    maxInstances: number = 1000
  ): RecurringEventInstance[] {
    const instances: RecurringEventInstance[] = []
    let currentDate = new Date(startDate)
    let count = 0

    // Ajusta a data inicial se necessário
    if (isBefore(currentDate, rangeStart)) {
      currentDate = this.findFirstOccurrenceInRange(rule, startDate, rangeStart)
    }

    while (
      count < maxInstances &&
      isBefore(currentDate, rangeEnd) &&
      (!rule.until || isBefore(currentDate, rule.until)) &&
      (!rule.count || instances.length < rule.count)
    ) {
      if (this.matchesRule(rule, currentDate, startDate)) {
        const endDate = new Date(currentDate.getTime() + eventDuration * 60000)
        
        instances.push({
          startDate: new Date(currentDate),
          endDate,
          originalStartDate: new Date(startDate)
        })
      }

      currentDate = this.getNextCandidate(rule, currentDate)
      count++
    }

    return instances.filter(instance => 
      isWithinInterval(instance.startDate, { start: rangeStart, end: rangeEnd })
    )
  }

  /**
   * Verifica se uma data específica corresponde à regra de recorrência
   */
  private matchesRule(rule: RecurrenceRule, date: Date, startDate: Date): boolean {
    // Verifica se a data está no intervalo correto baseado na frequência
    if (!this.isValidInterval(rule, date, startDate)) {
      return false
    }

    // Verifica restrições específicas
    if (rule.byWeekDay && rule.byWeekDay.length > 0) {
      const dayOfWeek = getDay(date)
      const weekDayNames = rule.byWeekDay.map(wd => WEEKDAY_MAP[wd])
      if (!weekDayNames.includes(dayOfWeek)) {
        return false
      }
    }

    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      const dayOfMonth = getDate(date)
      if (!rule.byMonthDay.includes(dayOfMonth)) {
        return false
      }
    }

    if (rule.bySetPos && rule.bySetPos.length > 0) {
      return this.matchesSetPos(rule, date)
    }

    return true
  }

  /**
   * Verifica se a data está no intervalo correto baseado na frequência
   */
  private isValidInterval(rule: RecurrenceRule, date: Date, startDate: Date): boolean {
    const interval = rule.interval || 1
    
    switch (rule.frequency) {
      case 'DAILY':
        const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff >= 0 && daysDiff % interval === 0

      case 'WEEKLY':
        const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
        return weeksDiff >= 0 && weeksDiff % interval === 0

      case 'MONTHLY':
        const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + 
                          (date.getMonth() - startDate.getMonth())
        return monthsDiff >= 0 && monthsDiff % interval === 0

      case 'YEARLY':
        const yearsDiff = date.getFullYear() - startDate.getFullYear()
        return yearsDiff >= 0 && yearsDiff % interval === 0

      default:
        return false
    }
  }

  /**
   * Verifica se a data corresponde às posições especificadas (bySetPos)
   */
  private matchesSetPos(rule: RecurrenceRule, date: Date): boolean {
    if (!rule.bySetPos || !rule.byWeekDay) return true

    const month = date.getMonth()
    const year = date.getFullYear()
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Encontra todas as ocorrências dos dias da semana especificados no mês
    const occurrences: Date[] = []
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth })
    
    for (const day of daysInMonth) {
      const dayOfWeek = getDay(day)
      const weekDayNames = rule.byWeekDay.map(wd => WEEKDAY_MAP[wd])
      if (weekDayNames.includes(dayOfWeek)) {
        occurrences.push(day)
      }
    }

    // Verifica se a data corresponde a uma das posições especificadas
    for (const pos of rule.bySetPos) {
      let targetDate: Date | undefined
      
      if (pos > 0) {
        // Posição positiva (1ª, 2ª, etc.)
        targetDate = occurrences[pos - 1]
      } else if (pos < 0) {
        // Posição negativa (-1 = última, -2 = penúltima, etc.)
        targetDate = occurrences[occurrences.length + pos]
      }

      if (targetDate && isSameDay(date, targetDate)) {
        return true
      }
    }

    return false
  }

  /**
   * Encontra a próxima data candidata baseada na frequência
   */
  private getNextCandidate(rule: RecurrenceRule, currentDate: Date): Date {
    const interval = rule.interval || 1

    switch (rule.frequency) {
      case 'DAILY':
        return addDays(currentDate, interval)
      
      case 'WEEKLY':
        return addWeeks(currentDate, interval)
      
      case 'MONTHLY':
        return addMonths(currentDate, interval)
      
      case 'YEARLY':
        return addYears(currentDate, interval)
      
      default:
        return addDays(currentDate, 1)
    }
  }

  /**
   * Encontra a primeira ocorrência dentro do intervalo especificado
   */
  private findFirstOccurrenceInRange(
    rule: RecurrenceRule, 
    startDate: Date, 
    rangeStart: Date
  ): Date {
    let candidate = new Date(startDate)
    const maxIterations = 10000 // Evita loops infinitos
    let iterations = 0

    while (isBefore(candidate, rangeStart) && iterations < maxIterations) {
      candidate = this.getNextCandidate(rule, candidate)
      iterations++
    }

    return candidate
  }

  /**
   * Valida uma regra de recorrência
   */
  validateRule(rule: RecurrenceRule): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validações básicas
    if (!rule.frequency) {
      errors.push('Frequência é obrigatória')
    }

    if (rule.interval && (rule.interval < 1 || rule.interval > 999)) {
      errors.push('Intervalo deve estar entre 1 e 999')
    }

    if (rule.count && rule.count < 1) {
      errors.push('Contagem deve ser maior que 0')
    }

    if (rule.until && rule.count) {
      errors.push('Não é possível especificar tanto contagem quanto data final')
    }

    // Validações específicas por frequência
    if (rule.frequency === 'WEEKLY' && rule.byMonthDay) {
      errors.push('byMonthDay não é válido para frequência semanal')
    }

    if (rule.frequency === 'DAILY' && (rule.byWeekDay || rule.byMonthDay)) {
      errors.push('byWeekDay e byMonthDay não são válidos para frequência diária')
    }

    if (rule.byMonthDay) {
      for (const day of rule.byMonthDay) {
        if (day < 1 || day > 31) {
          errors.push(`Dia do mês inválido: ${day}`)
        }
      }
    }

    if (rule.bySetPos && !rule.byWeekDay) {
      errors.push('bySetPos requer byWeekDay')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Converte uma regra de recorrência para string legível
   */
  ruleToString(rule: RecurrenceRule, locale: string = 'pt-BR'): string {
    const { frequency, interval = 1, byWeekDay, byMonthDay, count, until } = rule

    let description = ''

    // Frequência base
    switch (frequency) {
      case 'DAILY':
        description = interval === 1 ? 'Diariamente' : `A cada ${interval} dias`
        break
      case 'WEEKLY':
        description = interval === 1 ? 'Semanalmente' : `A cada ${interval} semanas`
        break
      case 'MONTHLY':
        description = interval === 1 ? 'Mensalmente' : `A cada ${interval} meses`
        break
      case 'YEARLY':
        description = interval === 1 ? 'Anualmente' : `A cada ${interval} anos`
        break
    }

    // Dias da semana
    if (byWeekDay && byWeekDay.length > 0) {
      const dayNames = {
        'SU': 'domingo',
        'MO': 'segunda-feira',
        'TU': 'terça-feira',
        'WE': 'quarta-feira',
        'TH': 'quinta-feira',
        'FR': 'sexta-feira',
        'SA': 'sábado'
      }
      const days = byWeekDay.map(day => dayNames[day]).join(', ')
      description += ` em ${days}`
    }

    // Dias do mês
    if (byMonthDay && byMonthDay.length > 0) {
      description += ` no dia ${byMonthDay.join(', ')} do mês`
    }

    // Fim da recorrência
    if (count) {
      description += `, por ${count} ocorrências`
    } else if (until) {
      description += `, até ${format(until, 'dd/MM/yyyy')}`
    }

    return description
  }
}

export const recurrenceEngine = new RecurrenceEngine()