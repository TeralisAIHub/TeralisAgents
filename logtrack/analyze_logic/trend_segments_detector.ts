export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
}

type AnalyzeOptions = {
  /**
   * Treat absolute percent change within this threshold as neutral
   * Defaults to 0.1 (%)
   */
  epsilonPct?: number
  /**
   * Only emit segments whose absolute change is at least this percent
   * Defaults to 0 (no filter)
   */
  minChangePct?: number
}

/** Round to 2 decimal places without locale artifacts */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Compute percent change from a to b (in %) */
function pctChange(a: number, b: number): number {
  if (a === 0) return 0
  return ((b - a) / a) * 100
}

/** Ensure points are sorted by timestamp asc and deduplicated by timestamp */
function normalizePoints(points: PricePoint[]): PricePoint[] {
  const sorted = [...points].sort((x, y) => x.timestamp - y.timestamp)
  const dedup: PricePoint[] = []
  const seen = new Set<number>()
  for (const p of sorted) {
    if (!Number.isFinite(p.priceUsd)) continue
    if (seen.has(p.timestamp)) continue
    seen.add(p.timestamp)
    dedup.push(p)
  }
  return dedup
}

/** Determine direction between two prices: 1 up, -1 down, 0 flat */
function dir(a: number, b: number): 1 | -1 | 0 {
  if (b > a) return 1
  if (b < a) return -1
  return 0
}

/**
 * Analyze a series of price points to determine overall trend segments.
 * - Builds maximal monotonic segments
 * - Enforces minSegmentLength
 * - Uses epsilonPct to classify small-move segments as neutral
 * - Can filter out tiny segments via minChangePct
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5,
  options: AnalyzeOptions = {}
): TrendResult[] {
  const results: TrendResult[] = []
  const eps = options.epsilonPct ?? 0.1
  const minAbs = options.minChangePct ?? 0

  const data = normalizePoints(points)
  if (data.length < minSegmentLength) return results

  // Two-pointer monotonic segmentation
  let segStart = 0
  let lastDir: 1 | -1 | 0 = dir(data[0].priceUsd, data[1].priceUsd)

  for (let i = 1; i < data.length; i++) {
    const d = dir(data[i - 1].priceUsd, data[i].priceUsd)

    // direction change detection (including flat transitions)
    const directionChanged =
      (d !== 0 && lastDir !== 0 && d !== lastDir) ||
      (d === 0 && lastDir !== 0) ||
      (d !== 0 && lastDir === 0)

    const isLastPoint = i === data.length - 1

    if (directionChanged || isLastPoint) {
      // Determine segment end index inclusive
      const endIdx = isLastPoint && !directionChanged ? i : i - 1
      const length = endIdx - segStart + 1

      if (length >= minSegmentLength) {
        const start = data[segStart]
        const end = data[endIdx]
        const changePct = pctChange(start.priceUsd, end.priceUsd)
        const absChange = Math.abs(changePct)

        // classify with epsilon window
        const trend: TrendResult["trend"] =
          absChange <= eps ? "neutral" : changePct > 0 ? "upward" : "downward"

        // optional minChange filter
        if (absChange >= minAbs || trend === "neutral") {
          results.push({
            startTime: start.timestamp,
            endTime: end.timestamp,
            trend,
            changePct: round2(changePct)
          })
        }
      }

      // Start new segment at the previous point to keep continuity
      segStart = endIdx
      lastDir = d
    } else {
      lastDir = d
    }
  }

  return results
}
