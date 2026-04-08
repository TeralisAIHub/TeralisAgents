export interface PairInfo {
  exchange: string
  pairAddress: string
  baseSymbol: string
  quoteSymbol: string
  liquidityUsd: number
  volume24hUsd: number
  priceUsd: number
  updatedAt?: number
}

export interface DexApiConfig {
  name: string
  baseUrl: string
  apiKey?: string
}

export interface DexSuiteConfig {
  apis: DexApiConfig[]
  timeoutMs?: number
  retries?: number
}

type PairEndpointResponse = {
  token0: { symbol: string }
  token1: { symbol: string }
  liquidityUsd: number | string
  volume24hUsd: number | string
  priceUsd: number | string
  updatedAt?: number
}

export class DexSuite {
  private readonly timeoutMs: number
  private readonly retries: number

  constructor(private config: DexSuiteConfig) {
    this.timeoutMs = Math.max(1000, config.timeoutMs ?? 10_000)
    this.retries = Math.max(0, config.retries ?? 1)
  }

  /* ----------------------- internals ----------------------- */

  private headersFor(api: DexApiConfig): Record<string, string> {
    return api.apiKey ? { Authorization: `Bearer ${api.apiKey}` } : {}
  }

  private withAbort<T>(promise: Promise<T>, ms: number): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    // @ts-ignore augment init later
    ;(promise as any).signal = controller.signal
    return promise.finally(() => clearTimeout(timer))
  }

  private async fetchJson<T>(api: DexApiConfig, path: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`${api.baseUrl}${path}`, {
      headers: this.headersFor(api),
      signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`${api.name} ${path} HTTP ${res.status}${text ? `: ${text}` : ""}`)
    }
    return (await res.json()) as T
  }

  private async fetchWithRetry<T>(api: DexApiConfig, path: string): Promise<T> {
    let attempt = 0
    while (true) {
      attempt++
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const data = await this.fetchJson<T>(api, path, controller.signal)
        return data
      } catch (err) {
        if (attempt > this.retries) throw err
      } finally {
        clearTimeout(timer)
      }
    }
  }

  private normalize(api: DexApiConfig, pairAddress: string, raw: PairEndpointResponse): PairInfo {
    return {
      exchange: api.name,
      pairAddress,
      baseSymbol: raw.token0?.symbol ?? "",
      quoteSymbol: raw.token1?.symbol ?? "",
      liquidityUsd: Number(raw.liquidityUsd) || 0,
      volume24hUsd: Number(raw.volume24hUsd) || 0,
      priceUsd: Number(raw.priceUsd) || 0,
      updatedAt: raw.updatedAt
    }
  }

  /* ------------------------ public ------------------------- */

  /**
   * Retrieve pair info from a single API.
   */
  async getPairInfoFrom(api: DexApiConfig, pairAddress: string): Promise<PairInfo | null> {
    try {
      const raw = await this.fetchWithRetry<PairEndpointResponse>(api, `/pair/${encodeURIComponent(pairAddress)}`)
      return this.normalize(api, pairAddress, raw)
    } catch {
      return null
    }
  }

  /**
   * Retrieve aggregated pair info across all configured DEX APIs.
   * @param pairAddress Blockchain address of the trading pair
   */
  async getPairInfo(pairAddress: string): Promise<PairInfo[]> {
    const tasks = this.config.apis.map(api => this.getPairInfoFrom(api, pairAddress))
    const settled = await Promise.all(tasks)
    return settled.filter((x): x is PairInfo => x !== null)
  }

  /**
   * Get the best quotes across exchanges for a given pair.
   */
  async getBestForPair(pairAddress: string): Promise<{
    bestVolume?: PairInfo
    bestLiquidity?: PairInfo
    bestPrice?: PairInfo
    all: PairInfo[]
  }> {
    const infos = await this.getPairInfo(pairAddress)
    const pick = (arr: PairInfo[], by: (p: PairInfo) => number): PairInfo | undefined =>
      arr.length ? arr.reduce((a, b) => (by(b) > by(a) ? b : a)) : undefined

    return {
      bestVolume: pick(infos, x => x.volume24hUsd),
      bestLiquidity: pick(infos, x => x.liquidityUsd),
      bestPrice: pick(infos, x => x.priceUsd),
      all: infos
    }
  }

  /**
   * Compare a list of pairs across exchanges, returning the best volume and liquidity.
   * Safely handles pairs with no available data.
   */
  async comparePairs(
    pairs: string[]
  ): Promise<Record<string, { bestVolume?: PairInfo; bestLiquidity?: PairInfo; bestPrice?: PairInfo }>> {
    const entries = await Promise.all(
      pairs.map(async addr => {
        const infos = await this.getPairInfo(addr)
        const best = await this.getBestForPair(addr)
        // If no infos, return undefined values
        return [addr, { bestVolume: best.bestVolume, bestLiquidity: best.bestLiquidity, bestPrice: best.bestPrice }] as const
      })
    )
    return Object.fromEntries(entries)
  }

  /**
   * Aggregate summary statistics for a pair across exchanges.
   */
  async summarizePair(pairAddress: string): Promise<{
    exchanges: number
    avgPriceUsd: number
    totalLiquidityUsd: number
    totalVolume24hUsd: number
  }> {
    const infos = await this.getPairInfo(pairAddress)
    const exchanges = infos.length
    const totalLiquidityUsd = infos.reduce((s, x) => s + x.liquidityUsd, 0)
    const totalVolume24hUsd = infos.reduce((s, x) => s + x.volume24hUsd, 0)
    const avgPriceUsd = exchanges ? infos.reduce((s, x) => s + x.priceUsd, 0) / exchanges : 0
    return { exchanges, avgPriceUsd, totalLiquidityUsd, totalVolume24hUsd }
  }
}
