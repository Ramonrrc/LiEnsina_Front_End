import type { MealUnit } from '../types'

export const mealUnitOrder: MealUnit[] = ['KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'PACKAGE', 'DOZEN']

export const mealUnitLabels: Record<MealUnit, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'ml',
  UNIT: 'unidade',
  BOX: 'caixa',
  PACKAGE: 'pacote',
  DOZEN: 'dúzia',
}

export function formatMealUnit(unit?: MealUnit | null) {
  return unit ? mealUnitLabels[unit] ?? unit : ''
}
