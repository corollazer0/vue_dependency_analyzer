/**
 * pinia utilities
 */

export function pinia(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function piniaAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(pinia(value)), 0)
  })
}

export const PINIA_DEFAULT = 'default'
