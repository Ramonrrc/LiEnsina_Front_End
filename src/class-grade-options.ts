const baseClassGradeOptions = [
  { value: 'EF1', label: '1\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF2', label: '2\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF3', label: '3\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF4', label: '4\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF5', label: '5\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF6', label: '6\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF7', label: '7\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF8', label: '8\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EF9', label: '9\u00BA Ano', description: 'Ensino Fundamental' },
  { value: 'EM1', label: '1\u00BA Ano', description: 'Ensino M\u00E9dio' },
  { value: 'EM2', label: '2\u00BA Ano', description: 'Ensino M\u00E9dio' },
  { value: 'EM3', label: '3\u00BA Ano', description: 'Ensino M\u00E9dio' },
]

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
}

export function normalizeClassGradeValue(value?: string | null) {
  const current = String(value ?? '').trim()
  const direct = current.toUpperCase()
  if (baseClassGradeOptions.some((option) => option.value === direct)) return direct

  const normalized = normalizeText(current)
  const numberMatch = normalized.match(/\b([1-9])\b/)
  const year = numberMatch ? Number(numberMatch[1]) : null

  if (year && normalized.includes('MEDIO') && year >= 1 && year <= 3) return `EM${year}`
  if (year && (normalized.includes('FUNDAMENTAL') || normalized.includes('ANO')) && year >= 1 && year <= 9) return `EF${year}`

  return current
}

export function formatClassGrade(value?: string | null) {
  const normalized = normalizeClassGradeValue(value)
  const option = baseClassGradeOptions.find((item) => item.value === normalized)
  if (!option) return String(value ?? '').trim() || 'Serie nao informada'

  return `${option.label} do ${option.description}`
}

export function getClassGradeOptions(currentGrade?: string | null) {
  const current = String(currentGrade ?? '').trim()
  if (!current || baseClassGradeOptions.some((option) => option.value === current)) return baseClassGradeOptions

  return [
    { value: current, label: formatClassGrade(current), description: 'Valor atual' },
    ...baseClassGradeOptions,
  ]
}
