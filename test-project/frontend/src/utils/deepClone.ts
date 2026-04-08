/**
 * deepClone utilities
 */

export function deepClone(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function deepCloneAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(deepClone(value)), 0)
  })
}

export const DEEPCLONE_DEFAULT = 'default'
