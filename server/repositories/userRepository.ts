import { User, type IUser, type UserRole } from '../models/User'
import type { FilterQuery } from 'mongoose'
import argon2 from 'argon2'

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
  archived?: boolean
}

export const userRepository = {
  async findAll(filters: UserFilters = {}, page = 1, limit = 10) {
    // Archived users are hidden from the active Users list unless explicitly requested
    const query: FilterQuery<IUser> = {
      isArchived: filters.archived ? true : { $ne: true }
    }

    if (filters.role) query.role = filters.role
    if (filters.isActive !== undefined) query.isActive = filters.isActive
    if (filters.search) {
      const sanitized = escapeRegex(filters.search.trim())
      query.$or = [
        { username: { $regex: sanitized, $options: 'i' } },
        { fullName: { $regex: sanitized, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      User.find(query)
        .populate('archivedBy', 'fullName username')
        .skip(skip)
        .limit(limit)
        .sort(filters.archived ? { archivedAt: -1 } : { createdAt: -1 })
        .lean(),
      User.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async findById(id: string) {
    return User.findById(id).lean()
  },

  async findByUsername(username: string) {
    return User.findOne({ username: username.toLowerCase() }).select('+password')
  },

  async create(data: CreateUserDto) {
    const user = new User(data)
    return user.save()
  },

  async update(id: string, data: UpdateUserDto) {
    if (data.password) {
      data.password = await argon2.hash(data.password)
    }
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true })
  },

  async remove(id: string) {
    return User.findByIdAndDelete(id)
  },

  async count() {
    return User.countDocuments()
  },

  async archive(id: string, archivedBy: string) {
    // Revoke refresh token so the archived user is signed out everywhere
    return User.findByIdAndUpdate(
      id,
      { isArchived: true, archivedAt: new Date(), archivedBy, refreshTokenHash: null },
      { new: true }
    )
  },

  async restore(id: string) {
    return User.findByIdAndUpdate(
      id,
      { isArchived: false, archivedAt: null, archivedBy: null },
      { new: true }
    )
  }
}
