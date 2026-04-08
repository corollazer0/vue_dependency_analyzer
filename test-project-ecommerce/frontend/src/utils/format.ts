export function formatCurrency(n: number) { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n) }
export function formatDate(d: string) { return new Date(d).toLocaleDateString('ko-KR') }
