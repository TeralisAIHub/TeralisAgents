export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export interface TokenMetadata {
  symbol: string
  name?: string
  decimals?: number
}

export interface TokenApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  private async handleResponse<T>(res: Response): Promise<TokenApiResponse<T>> {
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}`, statusCode: res.status }
    }
    try {
      const data = (await res.json()) as T
      return { success: true, data, statusCode: res.status }
    } catch (err: any) {
      return { success: false, error: err.message, statusCode: res.status }
    }
  }

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenApiResponse<TokenDataPoint[]>> {
    try {
      const res = await fetch(
        `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`,
        { method: "GET" }
      )
      const apiRes = await this.handleResponse<any[]>(res)
      if (!apiRes.success || !apiRes.data) return apiRes
      const points: TokenDataPoint[] = apiRes.data.map(r => ({
        timestamp: Number(r.time) * 1000,
        priceUsd: Number(r.priceUsd),
        volumeUsd: Number(r.volumeUsd),
        marketCapUsd: Number(r.marketCapUsd)
      }))
      return { success: true, data: points }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Fetch token metadata like symbol, name, decimals
   * Endpoint: `${apiBase}/tokens/${symbol}/metadata`
   */
  async fetchMetadata(symbol: string): Promise<TokenApiResponse<TokenMetadata>> {
    try {
      const res = await fetch(
        `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/metadata`,
        { method: "GET" }
      )
      return this.handleResponse<TokenMetadata>(res)
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Fetch latest price snapshot for a token
   * Endpoint: `${apiBase}/tokens/${symbol}/latest`
   */
  async fetchLatest(symbol: string): Promise<TokenApiResponse<TokenDataPoint>> {
    try {
      const res = await fetch(
        `${this.apiBase}/tokens/${encodeURIComponent(symbol)}/latest`,
        { method: "GET" }
      )
      const apiRes = await this.handleResponse<any>(res)
      if (!apiRes.success || !apiRes.data) return apiRes
      const r = apiRes.data
      const point: TokenDataPoint = {
        timestamp: Number(r.time) * 1000,
        priceUsd: Number(r.priceUsd),
        volumeUsd: Number(r.volumeUsd),
        marketCapUsd: Number(r.marketCapUsd)
      }
      return { success: true, data: point }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
