/**
 * env utilities
 */

export function env(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function envAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(env(value)), 0)
  })
}

export const ENV_DEFAULT = 'default'
