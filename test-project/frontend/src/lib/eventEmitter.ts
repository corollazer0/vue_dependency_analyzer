/**
 * eventEmitter utilities
 */

export function eventEmitter(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function eventEmitterAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(eventEmitter(value)), 0)
  })
}

export const EVENTEMITTER_DEFAULT = 'default'
