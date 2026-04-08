/**
 * helpers utilities
 */

export function helpers(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function helpersAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(helpers(value)), 0)
  })
}

export const HELPERS_DEFAULT = 'default'
