import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

const BRIDGE_URL = 'http://127.0.0.1:52181'

let startPromise: Promise<boolean> | null = null

export interface ReaderStatus {
  connected: boolean
  unitId: number
  description: string
  manufacturer?: string
  model?: string
  status: string
  message?: string
}

export interface BiometricCandidate {
  id: string
  name: string
  type: 'driver' | 'user'
  identifier: string
  template: string
}

export interface CheckDuplicateResult {
  success: boolean
  isDuplicate: boolean
  score?: number
  matchedCandidate?: {
    id: string
    name: string
    type: 'driver' | 'user'
    identifier: string
  }
  message: string
  error?: string
}

export const biometricBridge = {
  /**
   * Ensures the local DigitalPersona U.are.U 4500 bridge service is running.
   */
  async ensureServiceRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${BRIDGE_URL}/reader`, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return true
    } catch {
      // Not responding yet
    }

    if (process.platform !== 'win32') {
      return false
    }

    if (startPromise) {
      return startPromise
    }

    startPromise = (async () => {
      const exePath = path.resolve(process.cwd(), 'server', 'biometric-service', 'BiometricService.exe')
      if (!fs.existsSync(exePath)) {
        console.warn(`[BiometricBridge] Executable not found at ${exePath}`)
        return false
      }

      console.log(`[BiometricBridge] Spawning ${exePath}...`)
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      })
      child.unref()

      // Poll up to 4 seconds for service to start
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 500))
        try {
          const res = await fetch(`${BRIDGE_URL}/reader`, { signal: AbortSignal.timeout(1000) })
          if (res.ok) {
            console.log('[BiometricBridge] Connected to BiometricService on port 52181')
            startPromise = null
            return true
          }
        } catch {}
      }

      startPromise = null
      return false
    })()

    return startPromise
  },

  /**
   * Queries the reader connection status.
   */
  async getReaderStatus(): Promise<ReaderStatus> {
    await this.ensureServiceRunning()
    try {
      const res = await fetch(`${BRIDGE_URL}/reader`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      return (await res.json()) as ReaderStatus
    } catch (err: any) {
      return {
        connected: false,
        unitId: 0,
        description: 'DigitalPersona 4500',
        status: 'Not Connected',
        message: 'Fingerprint reader not detected. Please connect the DigitalPersona fingerprint reader and try again.'
      }
    }
  },

  /**
   * Initiates enrollment session for the U.are.U 4500.
   */
  async startEnrollment(): Promise<any> {
    await this.ensureServiceRunning()
    const res = await fetch(`${BRIDGE_URL}/enroll/start`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    })
    return res.json()
  },

  /**
   * Captures a single scan during multi-scan enrollment.
   */
  async captureEnrollSample(): Promise<any> {
    await this.ensureServiceRunning()
    const res = await fetch(`${BRIDGE_URL}/enroll/capture`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000)
    })
    return res.json()
  },

  /**
   * Cancels current active scan or enrollment session.
   */
  async cancelOperation(): Promise<any> {
    try {
      const res = await fetch(`${BRIDGE_URL}/cancel`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000)
      })
      return res.json()
    } catch {
      return { success: true, status: 'cancelled' }
    }
  },

  /**
   * 1:1 Verification of a finger touch against a template.
   */
  async verify(templateId: string): Promise<{ success: boolean; match: boolean; message: string }> {
    await this.ensureServiceRunning()
    const res = await fetch(`${BRIDGE_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId }),
      signal: AbortSignal.timeout(25000)
    })
    return res.json()
  },

  /**
   * 1:N Identification of a finger touch against all enrolled templates.
   */
  async identify(): Promise<{ success: boolean; match: boolean; templateId?: string; message: string }> {
    await this.ensureServiceRunning()
    const res = await fetch(`${BRIDGE_URL}/identify`, {
      method: 'POST',
      signal: AbortSignal.timeout(25000)
    })
    return res.json()
  },

  /**
   * Checks if a target template biometrically matches any existing template in the candidate list.
   */
  async checkDuplicate(targetTemplate: string, candidates: BiometricCandidate[]): Promise<CheckDuplicateResult> {
    await this.ensureServiceRunning()
    try {
      const res = await fetch(`${BRIDGE_URL}/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTemplate, candidates }),
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) {
        throw new Error(`Biometric service responded with ${res.status}`)
      }
      return (await res.json()) as CheckDuplicateResult
    } catch (err: any) {
      console.warn('[BiometricBridge] Duplicate check via native service failed or timed out:', err.message)
      // Fallback: check exact string match
      const exactMatch = candidates.find(c => c.template === targetTemplate)
      if (exactMatch) {
        return {
          success: true,
          isDuplicate: true,
          score: 0,
          matchedCandidate: {
            id: exactMatch.id,
            name: exactMatch.name,
            type: exactMatch.type,
            identifier: exactMatch.identifier
          },
          message: 'Fingerprint is already registered in the system.'
        }
      }
      return {
        success: false,
        isDuplicate: false,
        message: 'Could not perform biometric minutiae deduplication check.',
        error: err.message
      }
    }
  },

  /**
   * Deletes a template from the biometric database.
   */
  async deleteTemplate(templateId: string): Promise<any> {
    try {
      const res = await fetch(`${BRIDGE_URL}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
        signal: AbortSignal.timeout(5000)
      })
      return res.json()
    } catch {
      return { success: true }
    }
  }
}

