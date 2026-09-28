export interface BiometricReaderStatus {
  connected: boolean
  description: string
  model?: string
  status?: string
}

export interface BiometricScanResult {
  success: boolean
  match: boolean
  templateId?: string
  error?: string
  status?: string
}

export const useBiometric = () => {
  const LOCAL_SERVICE_URL = 'http://127.0.0.1:52181'

  /**
   * Checks if the local USB fingerprint reader is connected and ready on THIS machine.
   * Does NOT check the central server's hardware.
   */
  const checkLocalReader = async (timeoutMs = 1500): Promise<BiometricReaderStatus> => {
    if (typeof window === 'undefined') {
      return { connected: false, description: 'Not Connected' }
    }
    try {
      const res = await fetch(`${LOCAL_SERVICE_URL}/reader`, {
        signal: AbortSignal.timeout(timeoutMs)
      })
      if (!res.ok) {
        return { connected: false, description: 'Not Connected' }
      }
      const data = await res.json()
      let desc = 'Fingerprint Reader'
      if (data.description && !data.description.startsWith('$') && !data.description.includes('{') && !data.description.toLowerCase().includes('digitalpersona')) {
        desc = data.description
      }
      return {
        connected: !!data.connected,
        description: desc,
        model: data.model,
        status: data.status
      }
    } catch {
      return { connected: false, description: 'Not Connected' }
    }
  }

  /**
   * Triggers a fingerprint scan on the local USB reader attached to THIS machine.
   */
  const captureScan = async (signal?: AbortSignal, timeoutMs = 25000): Promise<BiometricScanResult> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const onExternalAbort = () => controller.abort()
      if (signal) {
        signal.addEventListener('abort', onExternalAbort)
      }

      const res = await fetch(`${LOCAL_SERVICE_URL}/identify`, {
        method: 'POST',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (signal) {
        signal.removeEventListener('abort', onExternalAbort)
      }

      return await res.json()
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, match: false, status: 'cancelled', error: 'Scan cancelled.' }
      }
      return { success: false, match: false, error: err.message || 'Failed to capture fingerprint from local reader.' }
    }
  }

  /**
   * Cancels any active scan on THIS machine's reader.
   */
  const cancelScan = async () => {
    try {
      await fetch(`${LOCAL_SERVICE_URL}/cancel`, {
        method: 'POST',
        signal: AbortSignal.timeout(2000)
      })
    } catch {}
  }

  /**
   * Starts multi-scan enrollment on THIS machine's reader.
   */
  const startEnrollment = async (): Promise<any> => {
    const res = await fetch(`${LOCAL_SERVICE_URL}/enroll/start`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    })
    return res.json()
  }

  /**
   * Captures a single enrollment sample on THIS machine's reader.
   */
  const captureEnrollSample = async (signal?: AbortSignal): Promise<any> => {
    const res = await fetch(`${LOCAL_SERVICE_URL}/enroll/capture`, {
      method: 'POST',
      signal: signal || AbortSignal.timeout(30000)
    })
    return res.json()
  }

  return {
    LOCAL_SERVICE_URL,
    checkLocalReader,
    captureScan,
    cancelScan,
    startEnrollment,
    captureEnrollSample
  }
}
