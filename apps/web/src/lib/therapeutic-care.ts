export type BudgetCalculationInput = {
  therapyValue: number
  valuePerSession: boolean
  quantity: number
  discountPercent?: number | null
  discountAmount?: number | null
}

export type BudgetCalculationResult = {
  unitValue: number
  grossTotal: number
  discountTotal: number
  netTotal: number
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeBudgetValues(input: BudgetCalculationInput): BudgetCalculationResult {
  const quantity = Math.max(1, Math.trunc(input.quantity || 1))
  const therapyValue = Math.max(0, Number(input.therapyValue || 0))

  const unitValue = input.valuePerSession
    ? therapyValue
    : therapyValue / quantity

  const grossTotal = roundCurrency(unitValue * quantity)
  const percent = Math.max(0, Number(input.discountPercent || 0))
  const fixed = Math.max(0, Number(input.discountAmount || 0))

  const discountFromPercent = roundCurrency(grossTotal * (percent / 100))
  const discountTotal = roundCurrency(Math.min(grossTotal, discountFromPercent + fixed))
  const netTotal = roundCurrency(Math.max(0, grossTotal - discountTotal))

  return {
    unitValue: roundCurrency(unitValue),
    grossTotal,
    discountTotal,
    netTotal,
  }
}

export function splitInstallments(totalAmount: number, installmentsCount: number): number[] {
  const count = Math.max(1, Math.trunc(installmentsCount || 1))
  const totalCents = Math.round(Number(totalAmount || 0) * 100)
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count

  return Array.from({ length: count }, (_, index) => {
    const cents = base + (index < remainder ? 1 : 0)
    return roundCurrency(cents / 100)
  })
}

export function getMonthlyDueDates(firstDueDate: Date, installmentsCount: number): Date[] {
  const count = Math.max(1, Math.trunc(installmentsCount || 1))
  const dates: Date[] = []
  const baseDay = firstDueDate.getDate()

  for (let i = 0; i < count; i += 1) {
    const date = new Date(firstDueDate)
    date.setMonth(firstDueDate.getMonth() + i)

    // Keep the preferred day when the target month supports it.
    if (date.getDate() !== baseDay) {
      date.setDate(0)
    }

    dates.push(date)
  }

  return dates
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
