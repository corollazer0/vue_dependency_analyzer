/**
 * constants utilities
 */

export function constants(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function constantsAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(constants(value)), 0)
  })
}

export const CONSTANTS_DEFAULT = 'default'
