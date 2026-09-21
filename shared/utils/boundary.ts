export const TAXI_TYPES = ['BATMAN', 'SUPERMAN'] as const
export type TaxiType = (typeof TAXI_TYPES)[number]

export const BOUNDARY_CONFIG = {
  BASE_HOURS: 16,
  OVERTIME_HOURLY_RATE: 100,
  OVERTIME_ROUNDING_MINUTES: 45,
  BASE_RATES: {
    BATMAN: 920,
    SUPERMAN: 990
  }
} as const

export interface BoundaryCalculationResult {
  taxiType: TaxiType
  baseBoundary: number
  elapsedHours: number
  elapsedMinutes: number
  totalMinutes: number
  overtimeHours: number
  boundary: number
  formattedElapsed: string
  isOvertime: boolean
}

/**
 * Normalizes any string representation to a valid TaxiType
 */
export function normalizeTaxiType(taxiType?: string | null): TaxiType {
  const upper = (taxiType || '').trim().toUpperCase()
  return upper === 'SUPERMAN' ? 'SUPERMAN' : 'BATMAN'
}

/**
 * User-friendly display format (e.g. 'Batman' or 'Superman')
 */
export function formatTaxiType(taxiType?: string | null): string {
  const norm = normalizeTaxiType(taxiType)
  return norm === 'SUPERMAN' ? 'Superman' : 'Batman'
}

/**
 * Formats a number to Philippine Peso currency string
 */
export function formatBoundaryCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return `₱${amount.toLocaleString('en-PH')}`
}

/**
 * Calculates the boundary based on deployment/dispatch time and taxi type.
 *
 * Rules:
 * - If elapsed time < 16 hours: Boundary = ₱0, Overtime = 0h
 * - If elapsed time >= 16 hours:
 *     Batman base: ₱920
 *     Superman base: ₱990
 *     Overtime elapsed time = elapsed time - 16 hours
 *     Overtime hours = completed overtime hours + (remaining overtime minutes >= 45 ? 1 : 0)
 *     Boundary = Base boundary + (Overtime hours * ₱100)
 */
export function calculateBoundary(
  taxiType: string | undefined | null,
  deploymentTime: Date | string | number,
  currentTime: Date | string | number = new Date()
): BoundaryCalculationResult {
  const normType = normalizeTaxiType(taxiType)
  const baseBoundary = BOUNDARY_CONFIG.BASE_RATES[normType]

  const startMs = new Date(deploymentTime).getTime()
  const endMs = new Date(currentTime).getTime()
  const diffMs = Math.max(0, endMs - startMs)

  const totalMinutes = Math.floor(diffMs / 60000)
  const elapsedHours = Math.floor(totalMinutes / 60)
  const elapsedMinutes = totalMinutes % 60

  let overtimeHours = 0
  let boundary = 0

  if (elapsedHours >= BOUNDARY_CONFIG.BASE_HOURS) {
    const completedOvertimeHours = elapsedHours - BOUNDARY_CONFIG.BASE_HOURS
    const hasAdditionalHour = elapsedMinutes >= BOUNDARY_CONFIG.OVERTIME_ROUNDING_MINUTES
    overtimeHours = completedOvertimeHours + (hasAdditionalHour ? 1 : 0)
    boundary = baseBoundary + (overtimeHours * BOUNDARY_CONFIG.OVERTIME_HOURLY_RATE)
  }

  return {
    taxiType: normType,
    baseBoundary,
    elapsedHours,
    elapsedMinutes,
    totalMinutes,
    overtimeHours,
    boundary,
    formattedElapsed: `${elapsedHours}h ${elapsedMinutes}m`,
    isOvertime: overtimeHours > 0
  }
}
