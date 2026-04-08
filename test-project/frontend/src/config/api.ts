/**
 * api utilities
 */

export function api(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function apiAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(api(value)), 0)
  })
}

export const API_DEFAULT = 'default'
