import { biometricBridge } from '../../utils/biometricBridge'

export default defineEventHandler(async () => {
  const status = await biometricBridge.getReaderStatus()
  return successResponse(status, 'Reader status retrieved')
})
