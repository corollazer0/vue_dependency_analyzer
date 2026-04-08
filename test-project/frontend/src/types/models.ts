/**
 * models utilities
 */

export function models(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function modelsAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(models(value)), 0)
  })
}

export const MODELS_DEFAULT = 'default'
