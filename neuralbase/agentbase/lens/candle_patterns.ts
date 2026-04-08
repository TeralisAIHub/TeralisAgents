import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

export interface DetectionOptions {
  /** Minimum confidence (0..1) to emit a signal */
  minConfidence?: number
  /** Minimum gap in candles between two signals of the same pattern */
  minGapCandles?: number
  /** If true, require a simple trend context for some patterns */
  requireTrendContext?: boolean
  /** Lookback for trend detection (SMA slope) */
  trendLookback?: number
}

/*------------------------------------------------------
 * Utilities
 *----------------------------------------------------*/

function clamp01(x: number): number {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function body(c: Candle): number {
  return Math.abs(c.close - c.open)
}

function range(c: Candle): number {
  return c.high - c.low
}

function sma(values: number[], period: number, endIdx: number): number {
  if (period <= 0) return 0
  if (endIdx - period + 1 < 0) return 0
  let s = 0
  for (let i = endIdx - period + 1; i <= endIdx; i++) s += values[i]
  return s / period
}

/** Determine a very simple trend direction via SMA slope: 1 up, -1 down, 0 flat */
function trendDirection(closes: number[], lookback: number, endIdx: number): -1 | 0 | 1 {
  if (endIdx < lookback * 2) return 0
  const a = sma(closes, lookback, endIdx - lookback)
  const b = sma(closes, lookback, endIdx)
  if (b > a) return 1
  if (b < a) return -1
  return 0
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const res = await fetch(`${this.apiUrl}/markets/${encodeURIComponent(symbol)}/candles?limit=${limit}`, {
      timeout: 10_000
    } as any)
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    const raw = (await res.json()) as Candle[]
    // Basic sanitation: ensure numeric fields
    return raw
      .filter(c => Number.isFinite(c.timestamp) && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const b = body(c)
    const r = range(c)
    if (r <= 0) return 0
    const lowerWick = Math.min(c.open, c.close) - c.low
    const bodyToRange = b / r
    const ratio = b > 0 ? lowerWick / b : 0
    // Long lower wick, small body, close near high half
    const closeInUpperHalf = c.close >= c.low + r * 0.5
    const conf = ratio > 2 && bodyToRange < 0.3 && closeInUpperHalf ? Math.min(ratio / 3, 1) : 0
    return clamp01(conf)
  }

  private isShootingStar(c: Candle): number {
    const b = body(c)
    const r = range(c)
    if (r <= 0) return 0
    const upperWick = c.high - Math.max(c.open, c.close)
    const bodyToRange = b / r
    const conf = b > 0 && upperWick / b > 2 && bodyToRange < 0.3 ? Math.min((upperWick / b) / 3, 1) : 0
    return clamp01(conf)
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close >= prev.open &&
      curr.open <= prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    const ratio = bodyPrev > 0 ? bodyCurr / bodyPrev : 1
    return clamp01(Math.min(ratio, 1))
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open >= prev.close &&
      curr.close <= prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    const ratio = bodyPrev > 0 ? bodyCurr / bodyPrev : 1
    return clamp01(Math.min(ratio, 1))
  }

  private isDoji(c: Candle): number {
    const r = range(c)
    const b = body(c)
    if (r <= 0) return 0
    const ratio = b / r
    return ratio < 0.1 ? clamp01(1 - ratio * 10) : 0
  }

  /* ------------------------- Detection API ------------------------ */

  /**
   * Detect patterns in a candle array
   */
  detectInSeries(candles: Candle[], opts: DetectionOptions = {}): PatternSignal[] {
    const minConf = opts.minConfidence ?? 0.6
    const minGap = Math.max(0, opts.minGapCandles ?? 1)
    const needTrend = !!opts.requireTrendContext
    const lookback = Math.max(2, opts.trendLookback ?? 10)

    const signals: PatternSignal[] = []
    const closes = candles.map(c => c.close)

    // Track last index per pattern for debouncing
    const lastIdx: Record<CandlestickPattern, number> = {
      Hammer: -Infinity,
      ShootingStar: -Infinity,
      BullishEngulfing: -Infinity,
      BearishEngulfing: -Infinity,
      Doji: -Infinity
    }

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      const prev = candles[i - 1]

      // Optional trend context
      const dir = needTrend ? trendDirection(closes, lookback, i) : 0

      // Hammer (often after a down move)
      const hammerConf = this.isHammer(c)
      if (hammerConf >= minConf && i - lastIdx.Hammer >= minGap) {
        if (!needTrend || dir <= 0) {
          signals.push({ timestamp: c.timestamp, pattern: "Hammer", confidence: hammerConf })
          lastIdx.Hammer = i
        }
      }

      // Shooting Star (often after an up move)
      const starConf = this.isShootingStar(c)
      if (starConf >= minConf && i - lastIdx.ShootingStar >= minGap) {
        if (!needTrend || dir >= 0) {
          signals.push({ timestamp: c.timestamp, pattern: "ShootingStar", confidence: starConf })
          lastIdx.ShootingStar = i
        }
      }

      // Engulfing requires previous candle
      if (prev) {
        const bullConf = this.isBullishEngulfing(prev, c)
        if (bullConf >= minConf && i - lastIdx.BullishEngulfing >= minGap) {
          if (!needTrend || dir >= 0) {
            signals.push({ timestamp: c.timestamp, pattern: "BullishEngulfing", confidence: bullConf })
            lastIdx.BullishEngulfing = i
          }
        }

        const bearConf = this.isBearishEngulfing(prev, c)
        if (bearConf >= minConf && i - lastIdx.BearishEngulfing >= minGap) {
          if (!needTrend || dir <= 0) {
            signals.push({ timestamp: c.timestamp, pattern: "BearishEngulfing", confidence: bearConf })
            lastIdx.BearishEngulfing = i
          }
        }
      }

      // Doji (indecision)
      const dojiConf = this.isDoji(c)
      if (dojiConf >= minConf && i - lastIdx.Doji >= minGap) {
        signals.push({ timestamp: c.timestamp, pattern: "Doji", confidence: dojiConf })
        lastIdx.Doji = i
      }
    }

    // Sort by time just in case
    return signals.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Convenience method: fetch candles for a symbol and detect patterns
   */
  async analyzeSymbol(
    symbol: string,
    limit = 200,
    options: DetectionOptions = {}
  ): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, limit)
    return this.detectInSeries(candles, options)
  }
}
