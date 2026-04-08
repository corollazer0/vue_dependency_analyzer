/**
 * formatCurrency utilities
 */

export function formatCurrency(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function formatCurrencyAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(formatCurrency(value)), 0)
  })
}

export const FORMATCURRENCY_DEFAULT = 'default'
