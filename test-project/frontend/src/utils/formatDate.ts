/**
 * formatDate utilities
 */

export function formatDate(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function formatDateAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(formatDate(value)), 0)
  })
}

export const FORMATDATE_DEFAULT = 'default'
