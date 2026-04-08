/**
 * guards utilities
 */

export function guards(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function guardsAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(guards(value)), 0)
  })
}

export const GUARDS_DEFAULT = 'default'
