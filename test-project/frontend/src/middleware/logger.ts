/**
 * logger utilities
 */

export function logger(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function loggerAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(logger(value)), 0)
  })
}

export const LOGGER_DEFAULT = 'default'
