/**
 * validators utilities
 */

export function validators(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function validatorsAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(validators(value)), 0)
  })
}

export const VALIDATORS_DEFAULT = 'default'
