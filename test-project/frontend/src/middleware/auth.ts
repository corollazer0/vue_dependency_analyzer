/**
 * auth utilities
 */

export function auth(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function authAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(auth(value)), 0)
  })
}

export const AUTH_DEFAULT = 'default'
