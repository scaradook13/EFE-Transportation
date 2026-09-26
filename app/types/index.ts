// ==================== User Types ====================
export type UserRole = 'admin' | 'dispatcher' | 'hr'

export interface UserBiometric {
  enrolled: boolean
  finger: string
  enrolledAt?: string | null
}

export interface User {
  _id: string
  username: string
  fullName: string
  email?: string
  role: UserRole
  isActive: boolean
  isPrimaryAdmin?: boolean
  biometric?: UserBiometric
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  userId: string
  username: string
  fullName: string
  email?: string
  role: UserRole
  isActive: boolean
  isPrimaryAdmin?: boolean
  biometric?: UserBiometric
}

// ==================== Driver Types ====================
export type EmploymentStatus = 'Active' | 'Inactive' | 'Expired License'
export type OperationalStatus = 'Available' | 'Active'

export interface EmergencyContact {
  name: string
  relationship: string
  contactNumber: string
}

export interface Driver {
  _id: string
  driverId: string
  fullName: string
  address: string
  contactNumber: string
  birthDate: string
  emergencyContact: EmergencyContact
  licenseNumber: string
  licenseExpiration: string
  photo: string | null
  photoFileId?: string | null
  dateHired?: string
  tinId?: string
  sssId?: string
  philhealthId?: string
  pagibigId?: string
  employmentStatus: EmploymentStatus
  operationalStatus: OperationalStatus
  fingerprint?: {
    registered: boolean;
    registeredAt?: string;
  }
  biometric?: UserBiometric
  createdBy: User | string
  updatedBy: User | string | null
  createdAt: string
  updatedAt: string
}

export interface CreateDriverPayload {
  driverId: string
  fullName: string
  address: string
  contactNumber: string
  birthDate: string
  emergencyContact: EmergencyContact
  licenseNumber: string
  licenseExpiration: string
  photo?: string | null
  photoFileId?: string | null
  dateHired?: string
  tinId?: string
  sssId?: string
  philhealthId?: string
  pagibigId?: string
  employmentStatus?: EmploymentStatus
  fingerprintCredential?: any
}

// ==================== Taxi Unit Types ====================
export type TaxiUnitStatus = 'Available' | 'In Use' | 'Maintenance'
export type TaxiType = 'BATMAN' | 'SUPERMAN'

export interface TaxiUnit {
  _id: string
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
  taxiType: TaxiType
  status: TaxiUnitStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTaxiUnitPayload {
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
  taxiType?: TaxiType
  status?: TaxiUnitStatus
}

// ==================== Dispatch Types ====================
export type DispatchStatus = 'Active' | 'Completed' | 'Cancelled'

export interface Dispatch {
  _id: string
  dispatchNumber: string
  driver: Driver | string
  taxiUnit: TaxiUnit | string
  passengerName: string
  pickupLocation: string
  destination: string
  dispatcher: User | string
  status: DispatchStatus
  departureTime: string
  arrivalTime: string | null
  tripDuration: number | null
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface CreateDispatchPayload {
  driver: string
  taxiUnit: string
  passengerName: string
  pickupLocation: string
  destination: string
  departureTime: string
  remarks?: string
}

export interface UpdateDispatchPayload {
  status?: DispatchStatus
  arrivalTime?: string
  remarks?: string
}

// ==================== Audit Log Types ====================
export interface AuditLog {
  _id: string
  user: User | string
  action: string
  module: string
  details: string
  ipAddress: string
  browser: string
  createdAt: string
}

// ==================== Dashboard Types ====================
export interface DashboardStats {
  availableDrivers: number
  activeDrivers: number
  availableTaxis: number
  inUseTaxis: number
  maintenanceTaxis: number
  todayAssignments: number
  todayReturned: number
  avgHours: number
}

export interface TrendDataPoint {
  date: string
  count: number
}

export interface DashboardData {
  stats: DashboardStats
  weeklyTrend: TrendDataPoint[]
  activeAssignments: any[]
}

// ==================== API Response Types ====================
export interface ApiResponse<T = unknown> {
  success: boolean
  statusCode?: number
  message: string
  data: T
}

export interface PaginatedResponse<T = unknown> {
  success: boolean
  message: string
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  pages: number
}

// ==================== Boundary Report Types ====================
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface BreakdownItem {
  label: string
  subLabel?: string
  date: string
  boundary: number
  dispatches: number
  totalMinutes: number
  totalHours: number
}

export interface BoundaryReportData {
  reportType?: 'taxi'
  taxi: {
    _id: string
    taxiNumber: string
    plateNumber: string
    brand: string
    model: string
    year: number
    color: string
    taxiType: TaxiType
    formattedTaxiType: string
    status: string
  }
  period: ReportPeriod
  dateRange: {
    startDate: string
    endDate: string
    displayLabel: string
    prevDate?: string
    nextDate?: string
  }
  activeDeployment: {
    assignmentId: string
    assignmentNumber: string
    driver: {
      _id: string
      fullName: string
      driverId: string
    }
    timeIn: string
    elapsedMinutes: number
    elapsedHours: number
    formattedElapsed: string
    currentBoundary: number
    baseBoundary: number
    overtimeHours: number
  } | null
  summary: {
    totalBoundary: number
    formattedTotalBoundary: string
    totalDispatches: number
    totalMinutes: number
    totalHours: number
    formattedTotalHours: string
    avgBoundary: number
    formattedAvgBoundary: string
  }
  breakdown: BreakdownItem[]
  records: Array<{
    _id: string
    assignmentNumber: string
    driverName: string
    driverId: string
    timeIn: string
    timeOut: string | null
    duration: string
    totalMinutes: number
    boundary: number
    formattedBoundary: string
    overtimeHours: number
    status: 'Active' | 'Completed'
  }>
}

export interface FleetTaxiSummary {
  _id: string
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  vehicle: string
  color: string
  taxiType: TaxiType
  formattedTaxiType: string
  status: string
  dispatches: number
  totalMinutes: number
  totalHours: number
  boundary: number
  formattedBoundary: string
}

export interface FleetBoundaryReportData {
  reportType: 'fleet'
  period: ReportPeriod
  dateRange: {
    startDate: string
    endDate: string
    displayLabel: string
    prevDate?: string
    nextDate?: string
  }
  summary: {
    totalTaxis: number
    activeTaxisInPeriod: number
    totalDispatches: number
    totalMinutes: number
    totalHours: number
    formattedTotalHours: string
    totalBoundary: number
    formattedTotalBoundary: string
    avgBoundaryPerTaxi: number
    formattedAvgBoundaryPerTaxi: string
  }
  taxis: FleetTaxiSummary[]
}


