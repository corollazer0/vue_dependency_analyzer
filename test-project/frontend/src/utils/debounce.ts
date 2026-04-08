/**
 * debounce utilities
 */

export function debounce(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function debounceAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(debounce(value)), 0)
  })
}

export const DEBOUNCE_DEFAULT = 'default'
