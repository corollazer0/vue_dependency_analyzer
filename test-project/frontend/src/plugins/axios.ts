/**
 * axios utilities
 */

export function axios(value: any): string {
  if (value == null) return ''
  return String(value)
}

export function axiosAsync(value: any): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(axios(value)), 0)
  })
}

export const AXIOS_DEFAULT = 'default'
