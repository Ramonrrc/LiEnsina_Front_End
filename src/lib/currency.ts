const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''

  return brlFormatter.format(Number(digits) / 100)
}

export function formatCurrencyInputValue(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? brlFormatter.format(value)
    : ''
}
