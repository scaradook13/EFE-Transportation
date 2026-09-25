import { biometricBridge } from '../utils/biometricBridge'

export default defineNitroPlugin(async (_nitroApp) => {
  if (process.platform === 'win32') {
    try {
      await biometricBridge.ensureServiceRunning()
      const status = await biometricBridge.getReaderStatus()
      if (status.connected) {
        console.log(`✅ DigitalPersona Reader Connected: ${status.description} (Unit #${status.unitId})`)
      } else {
        console.log(`ℹ️ DigitalPersona Reader: ${status.status} (${status.message || 'Not detected'})`)
      }
    } catch (err: any) {
      console.warn('⚠️ Biometric service initialization warning:', err.message)
    }
  }
})
