export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  dryRun?: boolean
  timeoutMs?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  gasUsed?: number
  blockNumber?: number
  error?: string
  durationMs?: number
  timestamp?: string
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  /**
   * Deploy a contract using the configured endpoint.
   * Returns extended details including timing and gas metrics (if provided by API).
   */
  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, dryRun, timeoutMs } = this.config
    const started = Date.now()
    try {
      const controller = new AbortController()
      const timer = timeoutMs
        ? setTimeout(() => controller.abort(), timeoutMs)
        : undefined

      const res = await fetch(deployEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ contractName, parameters, dryRun }),
        signal: controller.signal,
      })

      if (timer) clearTimeout(timer)

      if (!res.ok) {
        const text = await res.text()
        return {
          success: false,
          error: `HTTP ${res.status}: ${text}`,
          durationMs: Date.now() - started,
          timestamp: new Date().toISOString(),
        }
      }

      const json = await res.json()
      return {
        success: true,
        address: json.contractAddress,
        transactionHash: json.txHash,
        gasUsed: json.gasUsed,
        blockNumber: json.blockNumber,
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Unknown error",
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      }
    }
  }
}
