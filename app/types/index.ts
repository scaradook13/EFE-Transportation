// ==================== User Types ====================
export type UserRole = 'admin' | 'dispatcher' | 'hr'

export interface User {
  _id: string
  username: string
  fullName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  userId: string
  username: string
  fullName: string
  role: UserRole
  isActive: boolean
}

// ==================== Driver Types ====================
export type EmploymentStatus = 'Active' | 'Inactive'
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
  employmentStatus: EmploymentStatus
  operationalStatus: OperationalStatus
  createdBy: User | string
  updatedBy: User | string | null
  createdAt: string
  updatedAt: string
}

export interface CreateDriverPayload {
  fullName: string
  address: string
  contactNumber: string
  birthDate: string
  emergencyContact: EmergencyContact
  licenseNumber: string
  licenseExpiration: string
  photo?: string | null
  employmentStatus?: EmploymentStatus
}

// ==================== Taxi Unit Types ====================
export type TaxiUnitStatus = 'Available' | 'In Use' | 'Maintenance'

export interface TaxiUnit {
  _id: string
  taxiNumber: string
  plateNumber: string
  brand: string
  model: string
  year: number
  color: string
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

// ==================== Notification Types ====================
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  _id: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  user: string
  createdAt: string
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
