/**
 * store utilities
 */

export function store(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function storeAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(store(value)), 0)
  })
}

export const STORE_DEFAULT = 'default'
