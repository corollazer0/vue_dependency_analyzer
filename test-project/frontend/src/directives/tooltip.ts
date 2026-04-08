/**
 * tooltip utilities
 */

export function tooltip(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function tooltipAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(tooltip(value)), 0)
  })
}

export const TOOLTIP_DEFAULT = 'default'
