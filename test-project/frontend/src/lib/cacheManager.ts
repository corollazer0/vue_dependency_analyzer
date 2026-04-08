/**
 * cacheManager utilities
 */

export function cacheManager(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function cacheManagerAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(cacheManager(value)), 0)
  })
}

export const CACHEMANAGER_DEFAULT = 'default'
