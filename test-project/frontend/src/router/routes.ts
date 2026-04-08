/**
 * routes utilities
 */

export function routes(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function routesAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(routes(value)), 0)
  })
}

export const ROUTES_DEFAULT = 'default'
