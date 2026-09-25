import { biometricBridge } from '../../utils/biometricBridge'

export default defineEventHandler(async (event) => {
  const result = await biometricBridge.cancelOperation()
  return successResponse(result, 'Operation cancelled')
})
