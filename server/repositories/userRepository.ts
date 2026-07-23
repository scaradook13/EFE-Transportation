import { User, type IUser, type UserRole } from '~~/server/models/User'
import type { FilterQuery } from 'mongoose'

export interface CreateUserDto {
  username: string
  password: string
  fullName: string
  role: UserRole
}

export interface UpdateUserDto {
  fullName?: string
  role?: UserRole
  isActive?: boolean
  password?: string
}

export interface UserFilters {
  role?: UserRole
  isActive?: boolean
  search?: string
}

export const userRepository = {
  async findAll(filters: UserFilters = {}, page = 1, limit = 10) {
    const query: FilterQuery<IUser> = {}

    if (filters.role) query.role = filters.role
    if (filters.isActive !== undefined) query.isActive = filters.isActive
    if (filters.search) {
      query.$or = [
        { username: { $regex: filters.search, $options: 'i' } },
        { fullName: { $regex: filters.search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findById(id: string) {
    return User.findById(id)
  },

  async findByUsername(username: string) {
    return User.findOne({ username: username.toLowerCase() }).select('+password')
  },

  async create(data: CreateUserDto) {
    const user = new User(data)
    return user.save()
  },

  async update(id: string, data: UpdateUserDto) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  },

  async remove(id: string) {
    return User.findByIdAndDelete(id)
  },

  async count() {
    return User.countDocuments()
  }
}
