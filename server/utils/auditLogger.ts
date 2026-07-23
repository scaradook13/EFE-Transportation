import { auditLogRepository } from '../repositories/auditLogRepository'
import type { H3Event } from 'h3'

export const logAudit = async (
  event: H3Event,
  userId: string,
  action: string,
  module: string,
  details = ''
) => {
  try {
    const ipAddress = getRequestIP(event, { xForwardedFor: true }) || 'Unknown'
    const browser = getRequestHeader(event, 'user-agent') || 'Unknown'

    await auditLogRepository.create({
      user: userId,
      action,
      module,
      details,
      ipAddress,
      browser
    })
  } catch (error) {
    // Non-blocking - don't fail the request if audit logging fails
    console.error('Audit log error:', error)
  }
}
