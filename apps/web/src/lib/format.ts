/**
 * Utility functions for formatting Brazilian documents and data
 */

/**
 * Format CPF (Brazilian individual taxpayer registry)
 * @param cpf - CPF string with or without formatting
 * @returns Formatted CPF string
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Format CNPJ (Brazilian company registry)
 * @param cnpj - CNPJ string with or without formatting
 * @returns Formatted CNPJ string
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Format Brazilian phone number
 * @param phone - Phone string with or without formatting
 * @returns Formatted phone string
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

/**
 * Format Brazilian postal code (CEP)
 * @param cep - CEP string with or without formatting
 * @returns Formatted CEP string
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '')
  if (cleaned.length !== 8) return cep
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Format currency in Brazilian Real
 * @param value - Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Format date in Brazilian format
 * @param date - Date object or string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('pt-BR')
}

/**
 * Format datetime in Brazilian format
 * @param date - Date object or string
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('pt-BR')
}