/**
 * i18n utilities
 */

export function i18n(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function i18nAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(i18n(value)), 0)
  })
}

export const I18N_DEFAULT = 'default'
