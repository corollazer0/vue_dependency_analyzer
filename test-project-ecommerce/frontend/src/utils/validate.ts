export function isEmail(v: string) { return /^[^@]+@[^@]+\.[^@]+$/.test(v) }
export function isPhone(v: string) { return /^01[0-9]{8,9}$/.test(v) }
