/**
 * throttle utilities
 */

export function throttle(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function throttleAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(throttle(value)), 0)
  })
}

export const THROTTLE_DEFAULT = 'default'
