import { z } from 'zod'

const contactNumberRegex = /^09\d{9}$/
const contactNumberMsg = 'Contact number must be exactly 11 digits and start with 09.'

const fullNameRegex = /^[A-Za-z\s'\.-]+$/
const fullNameMsg = 'Full name cannot contain numbers or special characters.'

const licenseNumberRegex = /^[A-Za-z0-9-]+$/
const licenseNumberMsg = 'License number must only contain letters, numbers, and hyphens.'

const plateNumberRegex = /^[A-Z]{3} \d{3,4}$/
const plateNumberMsg = 'Plate number must be in standard format (e.g., ABC 1234).'

// --- User Validations ---
export const userSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.').min(3, 'Full name must be at least 3 characters.'),
  username: z.string().min(1, 'Username is required.').min(4, 'Username must be at least 4 characters.').regex(/^\S+$/, 'Username cannot contain spaces.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').regex(/[A-Z]/, 'Password must contain at least one uppercase letter.').regex(/[a-z]/, 'Password must contain at least one lowercase letter.').regex(/[0-9]/, 'Password must contain at least one number.').regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
  role: z.enum(['admin', 'dispatcher', 'hr'], { errorMap: () => ({ message: 'Role must be admin, dispatcher, or hr.' }) }),
  isActive: z.boolean().optional()
})

// Optional password for edit form (where password can be left blank)
export const userEditSchema = userSchema.extend({
  password: z.string().optional().superRefine((val, ctx) => {
    if (!val || val.trim() === '') return
    const result = userSchema.shape.password.safeParse(val)
    if (!result.success) {
      result.error.issues.forEach(issue => ctx.addIssue(issue))
    }
  })
})

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.')
})

// --- Driver Validations ---
export const driverSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required.')
    .min(3, 'Full name must be at least 3 characters.')
    .max(100, 'Full name must not exceed 100 characters.')
    .regex(fullNameRegex, fullNameMsg),
  address: z.string().min(1, 'Address is required.').min(5, 'Address must be at least 5 characters.').max(255, 'Address must not exceed 255 characters.'),
  contactNumber: z.string().min(1, 'Contact number is required.').regex(contactNumberRegex, contactNumberMsg),
  birthDate: z.string().min(1, 'Birth date is required.').refine(date => {
    const today = new Date()
    const dob = new Date(date)
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age >= 18
  }, 'Driver must be at least 18 years old.'),
  dateHired: z.string().optional().or(z.literal('')).refine(date => {
    if (!date) return true
    return !isNaN(new Date(date).getTime()) && new Date(date) <= new Date()
  }, 'Date Hired cannot be a future date.'),
  emergencyContact: z.object({
    name: z.string().optional().or(z.literal('')),
    relationship: z.string().optional().or(z.literal('')),
    contactNumber: z.string().optional().or(z.literal(''))
  }).optional(),
  licenseNumber: z.string().min(1, 'License number is required.').regex(licenseNumberRegex, licenseNumberMsg),
  licenseExpiration: z.string().min(1, 'License expiration is required.').refine(date => {
    // Basic format validation, backend handles real expiration logic for Create/Edit
    return !isNaN(new Date(date).getTime())
  }, 'Invalid date format.'),
  tinId: z.string().max(20, 'TIN ID must not exceed 20 characters.').regex(/^[A-Za-z0-9-]+$/, 'TIN ID can only contain letters, numbers, and hyphens.').optional().or(z.literal('')),
  sssId: z.string().max(20, 'SSS ID must not exceed 20 characters.').regex(/^[0-9-]+$/, 'SSS ID can only contain numbers and hyphens.').optional().or(z.literal('')),
  philhealthId: z.string().max(20, 'PhilHealth ID must not exceed 20 characters.').regex(/^[0-9-]+$/, 'PhilHealth ID can only contain numbers and hyphens.').optional().or(z.literal('')),
  pagibigId: z.string().max(20, 'Pag-IBIG ID must not exceed 20 characters.').regex(/^[0-9-]+$/, 'Pag-IBIG ID can only contain numbers and hyphens.').optional().or(z.literal('')),
  photo: z.string().nullable().optional(),
  employmentStatus: z.enum(['Active', 'Inactive']).optional()
})

// --- Taxi Unit Validations ---
export const taxiUnitSchema = z.object({
  taxiNumber: z.string().min(1, 'Taxi number is required.').trim(),
  plateNumber: z.string().min(1, 'Plate number is required.').regex(plateNumberRegex, plateNumberMsg).trim(),
  brand: z.string().min(1, 'Brand is required.'),
  model: z.string().min(1, 'Model is required.'),
  year: z.number({ required_error: 'Year is required.', invalid_type_error: 'Year must be a number.' }).int().max(new Date().getFullYear(), `Year cannot be greater than ${new Date().getFullYear()}.`),
  color: z.string().min(1, 'Color is required.'),
  status: z.enum(['Available', 'In Use', 'Maintenance']).optional()
})

// --- Assignment Validations ---
export const assignmentIssueSchema = z.object({
  driverId: z.string().min(1, 'Please select a driver.'),
  taxiUnitId: z.string().min(1, 'Please select a taxi unit.'),
  remarks: z.string().optional()
})

export const assignmentReturnSchema = z.object({
  remarks: z.string().optional()
})
