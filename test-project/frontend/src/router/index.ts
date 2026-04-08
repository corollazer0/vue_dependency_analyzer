/**
 * index utilities
 */

export function index(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function indexAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(index(value)), 0)
  })
}

export const INDEX_DEFAULT = 'default'
