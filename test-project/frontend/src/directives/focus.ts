/**
 * focus utilities
 */

export function focus(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function focusAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(focus(value)), 0)
  })
}

export const FOCUS_DEFAULT = 'default'
