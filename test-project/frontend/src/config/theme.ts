/**
 * theme utilities
 */

export function theme(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function themeAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(theme(value)), 0)
  })
}

export const THEME_DEFAULT = 'default'
