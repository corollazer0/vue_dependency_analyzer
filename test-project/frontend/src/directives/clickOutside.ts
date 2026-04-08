/**
 * clickOutside utilities
 */

export function clickOutside(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function clickOutsideAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clickOutside(value)), 0)
  })
}

export const CLICKOUTSIDE_DEFAULT = 'default'
