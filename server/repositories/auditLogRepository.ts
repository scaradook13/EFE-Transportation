import { AuditLog } from '~~/server/models/AuditLog'

export interface AuditLogFilters {
  user?: string
  module?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export const auditLogRepository = {
  async findAll(filters: AuditLogFilters = {}, page = 1, limit = 20) {
    const query: Record<string, unknown> = {}

    if (filters.user) query.user = filters.user
    if (filters.module) query.module = filters.module
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {}
      if (filters.dateFrom) (query.createdAt as Record<string, unknown>).$gte = new Date(filters.dateFrom)
      if (filters.dateTo) (query.createdAt as Record<string, unknown>).$lte = new Date(filters.dateTo)
    }

    if (filters.search) {
      const User = mongoose.model('User')
      const users = await User.find({ fullName: { $regex: filters.search, $options: 'i' } }).select('_id')
      const userIds = users.map((u: any) => u._id)
      
      const searchRegex = { $regex: filters.search, $options: 'i' }
      const orConditions: any[] = [
        { action: searchRegex },
        { module: searchRegex },
        { details: searchRegex }
      ]
      
      if (userIds.length > 0) {
        orConditions.push({ user: { $in: userIds } })
      }
      
      query.$or = orConditions
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'fullName username role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query)
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async create(data: {
    user: string
    action: string
    module: string
    details?: string
    ipAddress?: string
    browser?: string
  }) {
    const log = new AuditLog(data)
    return log.save()
  }
}
